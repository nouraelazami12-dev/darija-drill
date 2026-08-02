import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAnthropic, ROLEPLAY_MODEL, NO_THINKING, extractText, formatDarija } from "@/lib/anthropic";
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

  const lastNpcMessage = [...history].reverse().find((m) => m.role === "assistant")?.content;

  const pendingList = pendingPhrases.length
    ? pendingPhrases.map((p) => `- ${formatDarija(p)} — "${p.english}"`).join("\n")
    : "(none left — the learner has used every target phrase already.)";

  const task = lastNpcMessage
    ? `The other character's most recent line was:\n"${lastNpcMessage}"\n\nSuggest 1-2 natural ways the learner could reply to THAT SPECIFIC LINE right now — real responses to what was just said, not generic phrases. If one of the pending target phrases fits naturally into a reply, work it in, but only if it genuinely fits; don't force it.`
    : `The conversation hasn't started yet. Suggest 1-2 natural ways the learner could open it, ideally working in one of the pending target phrases if it fits.`;

  try {
    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: ROLEPLAY_MODEL,
      max_tokens: 300,
      thinking: NO_THINKING,
      system:
        "You are a Moroccan Darija tutor helping a learner mid-roleplay respond to what the other character just said. Suggest concrete, relevant replies to their most recent line — not a generic vocabulary list. For each suggestion, give the Arabic script, the Latin/Arabizi transliteration, and a brief English gloss. Be concise — no preamble, just the suggestions.",
      messages: [
        {
          role: "user",
          content: `Scenario: ${scenario.name} — ${scenario.description ?? ""}\n\nConversation so far:\n${transcript}\n\nTarget phrases still pending (use only if they genuinely fit a reply):\n${pendingList}\n\n${task}`,
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
