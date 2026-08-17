import { NextRequest, NextResponse } from "next/server";
import type { ToolUseBlock } from "@anthropic-ai/sdk/resources/messages";
import { prisma } from "@/lib/prisma";
import {
  getAnthropic,
  ROLEPLAY_MODEL,
  ROLEPLAY_TOOL,
  VERB_DRILL_TOOL,
  NO_THINKING,
  verbDrillSystemPrompt,
  verbConversationSystemPrompt,
} from "@/lib/anthropic";

function parseVerbs(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }
  const messages = await prisma.verbPracticeMessage.findMany({
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

  const session = await prisma.verbPracticeSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const verbs = parseVerbs(session.verbs);

  const userMessage = await prisma.verbPracticeMessage.create({
    data: { sessionId, role: "user", content: message.trim() },
  });

  const allHistory = await prisma.verbPracticeMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
  const history = allHistory.slice(-30);

  if (session.mode === "drill") {
    let feedback = "";
    let verdict: string | null = null;
    let correctAnswer = "";
    let nextPrompt = "";

    try {
      const anthropic = getAnthropic();
      const response = await anthropic.messages.create({
        model: ROLEPLAY_MODEL,
        max_tokens: 500,
        thinking: NO_THINKING,
        system: verbDrillSystemPrompt(verbs),
        tools: [VERB_DRILL_TOOL],
        tool_choice: { type: "tool", name: "drill_turn" },
        messages: history.map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        })),
      });

      const toolUse = response.content.find((b): b is ToolUseBlock => b.type === "tool_use");
      const input = toolUse?.input as
        | { feedback?: string; verdict?: string; correct_answer?: string; next_prompt?: string }
        | undefined;

      feedback = input?.feedback ?? "";
      verdict = input?.verdict ?? null;
      correctAnswer = input?.correct_answer ?? "";
      nextPrompt = input?.next_prompt ?? "";
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "LLM request failed", userMessage },
        { status: 502 }
      );
    }

    const assistantMessage = await prisma.verbPracticeMessage.create({
      data: {
        sessionId,
        role: "assistant",
        content: nextPrompt,
        feedback: feedback || null,
        verdict,
        correctAnswer: correctAnswer || null,
      },
    });

    return NextResponse.json({ userMessage, assistantMessage });
  }

  let dialogue = "";
  let translation = "";
  let correction = "";

  try {
    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: ROLEPLAY_MODEL,
      max_tokens: 1024,
      thinking: NO_THINKING,
      system: verbConversationSystemPrompt(verbs),
      tools: [ROLEPLAY_TOOL],
      tool_choice: { type: "tool", name: "respond_in_character" },
      messages: history.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
    });

    const toolUse = response.content.find((b): b is ToolUseBlock => b.type === "tool_use");
    const input = toolUse?.input as
      | { dialogue?: string; english_translation?: string; correction?: string }
      | undefined;

    dialogue = input?.dialogue ?? "";
    translation = input?.english_translation ?? "";
    correction = input?.correction ?? "";
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "LLM request failed", userMessage },
      { status: 502 }
    );
  }

  const assistantMessage = await prisma.verbPracticeMessage.create({
    data: {
      sessionId,
      role: "assistant",
      content: dialogue,
      translation: translation || null,
      correction: correction || null,
    },
  });

  return NextResponse.json({ userMessage, assistantMessage });
}
