import { NextRequest, NextResponse } from "next/server";
import type { ToolUseBlock } from "@anthropic-ai/sdk/resources/messages";
import { prisma } from "@/lib/prisma";
import {
  getAnthropic,
  ROLEPLAY_MODEL,
  ROLEPLAY_TOOL,
  NO_THINKING,
  roleplaySystemPrompt,
  type ScriptFormat,
} from "@/lib/anthropic";
import { nextBox, nextReviewDate } from "@/lib/leitner";
import { recordPracticeToday } from "@/lib/streak";
import { parseIdArray, mergeIds } from "@/lib/roleplay";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }
  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, message } = body as { sessionId: string; message: string };

  if (!sessionId || !message?.trim()) {
    return NextResponse.json({ error: "sessionId and message are required" }, { status: 400 });
  }

  const session = await prisma.roleplaySession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const scenario = await prisma.scenario.findUnique({ where: { id: session.scenarioId } });
  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  const targetIds = parseIdArray(session.targetPhraseIds);
  const targetPhrasesUnordered = await prisma.phrase.findMany({ where: { id: { in: targetIds } } });
  const byId = new Map(targetPhrasesUnordered.map((p) => [p.id, p]));
  const targetPhrases = targetIds.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p);

  const knownVocabulary = await prisma.phrase.findMany({
    where: { id: { notIn: targetIds } },
    orderBy: [{ box: "desc" }, { createdAt: "desc" }],
    take: 40,
  });

  const userMessage = await prisma.chatMessage.create({
    data: { scenarioId: session.scenarioId, sessionId, role: "user", content: message.trim() },
  });

  const allHistory = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
  const history = allHistory.slice(-30);

  let dialogue = "";
  let translation = "";
  let correction = "";
  let modeledNumbers: number[] = [];
  let usedNumbers: number[] = [];
  let missedNumbers: number[] = [];

  try {
    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: ROLEPLAY_MODEL,
      max_tokens: 1024,
      thinking: NO_THINKING,
      system: roleplaySystemPrompt(
        scenario.name,
        scenario.description ?? "",
        session.scriptFormat as ScriptFormat,
        targetPhrases.map((p) => ({
          darijaArabic: p.darijaArabic,
          darijaLatin: p.darijaLatin,
          english: p.english,
          box: p.box,
        })),
        knownVocabulary.map((p) => ({
          darijaArabic: p.darijaArabic,
          darijaLatin: p.darijaLatin,
          english: p.english,
        }))
      ),
      tools: [ROLEPLAY_TOOL],
      tool_choice: { type: "tool", name: "respond_in_character" },
      messages: history.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
    });

    const toolUse = response.content.find((b): b is ToolUseBlock => b.type === "tool_use");
    const input = toolUse?.input as
      | {
          dialogue?: string;
          english_translation?: string;
          correction?: string;
          target_phrases_modeled?: number[];
          target_phrases_used?: number[];
          target_phrases_missed?: number[];
        }
      | undefined;

    dialogue = input?.dialogue ?? "";
    translation = input?.english_translation ?? "";
    correction = input?.correction ?? "";
    modeledNumbers = input?.target_phrases_modeled ?? [];
    usedNumbers = input?.target_phrases_used ?? [];
    missedNumbers = input?.target_phrases_missed ?? [];
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "LLM request failed", userMessage },
      { status: 502 }
    );
  }

  const numberToPhraseId = (n: number) => targetPhrases[n - 1]?.id;
  const modeledIds = modeledNumbers.map(numberToPhraseId).filter((id): id is string => !!id);
  const usedIds = usedNumbers.map(numberToPhraseId).filter((id): id is string => !!id);
  const missedIds = missedNumbers
    .map(numberToPhraseId)
    .filter((id): id is string => !!id)
    .filter((id) => !usedIds.includes(id));

  const previouslyUsed = parseIdArray(session.usedPhraseIds);
  const previouslyModeled = parseIdArray(session.modeledPhraseIds);
  const newlyUsedIds = usedIds.filter((id) => !previouslyUsed.includes(id));

  for (const phraseId of newlyUsedIds) {
    const phrase = byId.get(phraseId);
    if (!phrase) continue;
    const boxAfter = nextBox(phrase.box, "got_it");
    await prisma.phrase.update({
      where: { id: phraseId },
      data: { box: boxAfter, nextReviewAt: nextReviewDate(boxAfter) },
    });
    await prisma.review.create({
      data: { phraseId, grade: "got_it", boxBefore: phrase.box, boxAfter },
    });
  }

  for (const phraseId of missedIds) {
    const phrase = byId.get(phraseId);
    if (!phrase) continue;
    const boxAfter = nextBox(phrase.box, "missed");
    await prisma.phrase.update({
      where: { id: phraseId },
      data: { box: boxAfter, nextReviewAt: nextReviewDate(boxAfter) },
    });
    await prisma.review.create({
      data: { phraseId, grade: "missed", boxBefore: phrase.box, boxAfter },
    });
  }

  if (newlyUsedIds.length > 0 || missedIds.length > 0) {
    await recordPracticeToday();
  }

  const mergedUsed = mergeIds(previouslyUsed, usedIds);
  const mergedModeled = mergeIds(previouslyModeled, modeledIds);

  await prisma.roleplaySession.update({
    where: { id: sessionId },
    data: {
      usedPhraseIds: JSON.stringify(mergedUsed),
      modeledPhraseIds: JSON.stringify(mergedModeled),
    },
  });

  const assistantMessage = await prisma.chatMessage.create({
    data: {
      scenarioId: session.scenarioId,
      sessionId,
      role: "assistant",
      content: dialogue,
      translation: translation || null,
      correction: correction || null,
    },
  });

  const refreshedTargetPhrases = await prisma.phrase.findMany({ where: { id: { in: targetIds } } });
  const refreshedById = new Map(refreshedTargetPhrases.map((p) => [p.id, p]));

  return NextResponse.json({
    userMessage,
    assistantMessage,
    progress: {
      targetPhrases: targetIds.map((id) => refreshedById.get(id)).filter(Boolean),
      usedPhraseIds: mergedUsed,
      modeledPhraseIds: mergedModeled,
    },
  });
}
