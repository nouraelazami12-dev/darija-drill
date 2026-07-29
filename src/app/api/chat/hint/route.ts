import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAnthropic, ROLEPLAY_MODEL, NO_THINKING, extractText } from "@/lib/anthropic";
import { parseIdArray } from "@/lib/roleplay";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId } = body as { sessionId: string };

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
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
  const usedIds = new Set(parseIdArray(session.usedPhraseIds));
  const pendingIds = targetIds.filter((id) => !usedIds.has(id));
  const pendingPhrases = await prisma.phrase.findMany({ where: { id: { in: pendingIds } } });

  const allHistory = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
  const history = allHistory.slice(-10);

  const transcript = history.length
    ? history.map((m) => `${m.role}: ${m.content}`).join("\n")
    : "(conversation hasn't started yet)";

  const pendingList = pendingPhrases.length
    ? pendingPhrases.map((p) => `- ${p.darijaArabic} ("${p.darijaLatin}") — "${p.english}"`).join("\n")
    : "(none left — the learner has used every target phrase already! Suggest a natural way to wrap up or continue the conversation.)";

  try {
    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: ROLEPLAY_MODEL,
      max_tokens: 300,
      thinking: NO_THINKING,
      system:
        "You are a Moroccan Darija tutor helping a learner mid-roleplay. Given the conversation so far and a list of specific target phrases they're still trying to work into the conversation, suggest how they could naturally bring up 1-2 of those phrases right now. For each, give the Arabic script, the Latin/Arabizi transliteration, and a brief English gloss, plus a one-line tip on when to say it. Be concise — no preamble, just the suggestions.",
      messages: [
        {
          role: "user",
          content: `Scenario: ${scenario.name} — ${scenario.description ?? ""}\n\nConversation so far:\n${transcript}\n\nTarget phrases still pending:\n${pendingList}\n\nSuggest how to bring up 1-2 of the pending phrases right now.`,
        },
      ],
    });
    return NextResponse.json({ hint: extractText(response) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "LLM request failed" },
      { status: 502 }
    );
  }
}
