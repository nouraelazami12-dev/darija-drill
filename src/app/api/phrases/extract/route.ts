import { NextRequest, NextResponse } from "next/server";
import type { Tool, ToolUseBlock } from "@anthropic-ai/sdk/resources/messages";
import { getAnthropic, ROLEPLAY_MODEL, NO_THINKING } from "@/lib/anthropic";

const EXTRACT_TOOL: Tool = {
  name: "record_phrases",
  description: "Record the Darija phrases/vocabulary found in the source text.",
  input_schema: {
    type: "object",
    properties: {
      phrases: {
        type: "array",
        description: "Every distinct Darija phrase or vocabulary item found in the text.",
        items: {
          type: "object",
          properties: {
            darijaArabic: { type: "string", description: "The phrase in Arabic script." },
            darijaLatin: { type: "string", description: "The phrase in Latin/Arabizi transliteration." },
            english: { type: "string", description: "The English meaning." },
            tag: {
              type: "string",
              description: "A short topic tag if obvious from context (e.g. 'taxi', 'greetings', 'numbers'), otherwise omit.",
            },
          },
          required: ["darijaArabic", "darijaLatin", "english"],
        },
      },
    },
    required: ["phrases"],
  },
};

const SYSTEM_PROMPT = `You help a Moroccan Darija learner turn raw class material into a study list. You'll be given messy source text — slide export, lesson transcript, or notes — that may contain headers, timestamps, speaker labels, or other clutter.

Extract every distinct Darija word or phrase actually being taught, along with its English meaning. For each one:
- Give the Arabic script and the Latin/Arabizi transliteration (supply whichever is missing from the source yourself, using standard Darija spelling).
- Give a concise English meaning.
- Add a short topic tag only if it's obvious (e.g. "greetings", "numbers", "taxi"); otherwise omit it.

Skip filler, headers, unrelated chatter, and anything that isn't an actual Darija phrase being taught. Do not invent phrases that aren't in the source.`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { text } = body as { text: string };

  if (!text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  try {
    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: ROLEPLAY_MODEL,
      max_tokens: 8000,
      thinking: NO_THINKING,
      system: SYSTEM_PROMPT,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "tool", name: "record_phrases" },
      messages: [{ role: "user", content: text.slice(0, 100_000) }],
    });

    const toolUse = response.content.find(
      (b): b is ToolUseBlock => b.type === "tool_use"
    );
    const phrases = (toolUse?.input as { phrases?: unknown[] } | undefined)?.phrases ?? [];

    return NextResponse.json({ phrases });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "LLM request failed" },
      { status: 502 }
    );
  }
}
