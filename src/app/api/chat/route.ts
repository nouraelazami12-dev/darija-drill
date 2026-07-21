import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAnthropic, ROLEPLAY_MODEL, roleplaySystemPrompt } from "@/lib/anthropic";

export async function GET(req: NextRequest) {
  const scenarioId = req.nextUrl.searchParams.get("scenarioId");
  if (!scenarioId) {
    return NextResponse.json({ error: "scenarioId is required" }, { status: 400 });
  }
  const messages = await prisma.chatMessage.findMany({
    where: { scenarioId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { scenarioId, message } = body as { scenarioId: string; message: string };

  if (!scenarioId || !message?.trim()) {
    return NextResponse.json(
      { error: "scenarioId and message are required" },
      { status: 400 }
    );
  }

  const scenario = await prisma.scenario.findUnique({ where: { id: scenarioId } });
  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  const userMessage = await prisma.chatMessage.create({
    data: { scenarioId, role: "user", content: message.trim() },
  });

  const allHistory = await prisma.chatMessage.findMany({
    where: { scenarioId },
    orderBy: { createdAt: "asc" },
  });
  const history = allHistory.slice(-30);

  let assistantText: string;
  try {
    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: ROLEPLAY_MODEL,
      max_tokens: 500,
      system: roleplaySystemPrompt(scenario.name, scenario.description ?? ""),
      messages: history.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
    });
    const block = response.content[0];
    assistantText = block.type === "text" ? block.text : "";
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "LLM request failed", userMessage },
      { status: 502 }
    );
  }

  const assistantMessage = await prisma.chatMessage.create({
    data: { scenarioId, role: "assistant", content: assistantText },
  });

  return NextResponse.json({ userMessage, assistantMessage });
}
