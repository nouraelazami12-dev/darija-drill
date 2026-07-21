import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAnthropic, ROLEPLAY_MODEL } from "@/lib/anthropic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { scenarioId } = body as { scenarioId: string };

  if (!scenarioId) {
    return NextResponse.json({ error: "scenarioId is required" }, { status: 400 });
  }

  const scenario = await prisma.scenario.findUnique({ where: { id: scenarioId } });
  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  const allHistory = await prisma.chatMessage.findMany({
    where: { scenarioId },
    orderBy: { createdAt: "asc" },
  });
  const history = allHistory.slice(-10);

  const transcript = history.length
    ? history.map((m) => `${m.role}: ${m.content}`).join("\n")
    : "(conversation hasn't started yet)";

  try {
    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: ROLEPLAY_MODEL,
      max_tokens: 300,
      system:
        "You are a Moroccan Darija tutor. Given a roleplay scenario and the conversation so far, suggest 2-3 short, useful Darija phrases the learner could say next. For each, give the Arabic script, the Latin/Arabizi transliteration, and a brief English gloss. Be concise — no preamble, just the list.",
      messages: [
        {
          role: "user",
          content: `Scenario: ${scenario.name} — ${scenario.description ?? ""}\n\nConversation so far:\n${transcript}\n\nSuggest 2-3 helpful phrases for what the learner could say next.`,
        },
      ],
    });
    const block = response.content[0];
    const text = block.type === "text" ? block.text : "";
    return NextResponse.json({ hint: text });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "LLM request failed" },
      { status: 502 }
    );
  }
}
