import { NextRequest, NextResponse } from "next/server";
import type { ToolUseBlock } from "@anthropic-ai/sdk/resources/messages";
import { prisma } from "@/lib/prisma";
import { getAnthropic, ROLEPLAY_MODEL, NO_THINKING, verbDrillSystemPrompt, VERB_DRILL_START_TOOL } from "@/lib/anthropic";
import { isVerbKey, DEFAULT_VERBS } from "@/lib/verbs";
import { pickNextCombo } from "@/lib/verbMastery";

function parseVerbs(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function serializeSession(session: { id: string; verbs: string; mode: string; createdAt: Date }) {
  return {
    id: session.id,
    verbs: parseVerbs(session.verbs),
    mode: session.mode,
    createdAt: session.createdAt,
  };
}

export async function GET() {
  const session = await prisma.verbPracticeSession.findFirst({
    orderBy: { createdAt: "desc" },
  });
  if (!session) return NextResponse.json(null);
  return NextResponse.json(serializeSession(session));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { verbs, mode } = body as { verbs?: string[]; mode?: string };

  const cleanVerbs = (verbs ?? []).filter(isVerbKey);
  const finalVerbs = cleanVerbs.length > 0 ? cleanVerbs : DEFAULT_VERBS;
  const finalMode = mode === "conversation" ? "conversation" : "drill";

  const session = await prisma.verbPracticeSession.create({
    data: { verbs: JSON.stringify(finalVerbs), mode: finalMode },
  });

  if (finalMode === "drill") {
    try {
      const combo = await pickNextCombo(finalVerbs);
      const anthropic = getAnthropic();
      const response = await anthropic.messages.create({
        model: ROLEPLAY_MODEL,
        max_tokens: 1000,
        thinking: NO_THINKING,
        system: verbDrillSystemPrompt(finalVerbs, combo),
        tools: [VERB_DRILL_START_TOOL],
        tool_choice: { type: "tool", name: "drill_turn" },
        messages: [{ role: "user", content: "Begin the drill with the first prompt." }],
      });
      const toolUse = response.content.find((b): b is ToolUseBlock => b.type === "tool_use");
      const input = toolUse?.input as
        | {
            next_prompt?: string;
            vocab_hints?: { english: string; darija: string }[];
            verb_conjugation_hint?: { tense: string; forms: { person: string; form: string }[] };
          }
        | undefined;
      const nextPrompt = input?.next_prompt?.trim();
      const vocabHints = Array.isArray(input?.vocab_hints) ? input.vocab_hints : [];
      const verbHint = input?.verb_conjugation_hint ?? null;
      if (nextPrompt) {
        await prisma.verbPracticeMessage.create({
          data: {
            sessionId: session.id,
            role: "assistant",
            content: nextPrompt,
            targetVerb: combo.verb,
            targetPerson: combo.person,
            vocabHints: vocabHints.length > 0 ? JSON.stringify(vocabHints) : null,
            verbHint: verbHint ? JSON.stringify(verbHint) : null,
          },
        });
      }
    } catch {
      // The learner can still kick things off with a normal message if the opening prompt fails.
    }
  }

  return NextResponse.json(serializeSession(session), { status: 201 });
}
