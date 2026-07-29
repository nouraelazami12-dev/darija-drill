import { NextRequest, NextResponse } from "next/server";
import type { Tool, ToolUseBlock } from "@anthropic-ai/sdk/resources/messages";
import { getAnthropic, ROLEPLAY_MODEL, NO_THINKING } from "@/lib/anthropic";

const TRANSLATE_TOOL: Tool = {
  name: "provide_translation",
  description: "Provide a Darija <-> English translation for the given word or phrase.",
  input_schema: {
    type: "object",
    properties: {
      detected_language: {
        type: "string",
        enum: ["english", "darija"],
        description: "Whether the input was English, or Darija (in either Arabic script or Latin/Arabizi).",
      },
      darija_arabic: { type: "string", description: "The word/phrase in Arabic script." },
      darija_latin: { type: "string", description: "The word/phrase in Latin/Arabizi transliteration." },
      english: { type: "string", description: "The English meaning." },
      notes: {
        type: "string",
        description:
          "Optional: alternate translations, regional variants, or brief usage context. Omit if not needed.",
      },
    },
    required: ["detected_language", "darija_arabic", "darija_latin", "english"],
  },
};

const SYSTEM_PROMPT = `You are a Moroccan Darija <-> English translation assistant for a language learner. You'll be given a single word or short phrase, which could be:
- English
- Darija written in Arabic script
- Darija written in Latin/Arabizi transliteration

Detect which one it is, then always provide all three: the Darija in Arabic script, the Darija in Latin/Arabizi transliteration, and the English meaning — regardless of which form was given as input, so the learner always sees the complete picture.

If there are multiple common translations, meaningfully different regional variants, or important usage context (e.g. formality, gender agreement), add a brief note. Keep it concise — this is a quick lookup tool, not an essay.`;

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
      max_tokens: 300,
      thinking: NO_THINKING,
      system: SYSTEM_PROMPT,
      tools: [TRANSLATE_TOOL],
      tool_choice: { type: "tool", name: "provide_translation" },
      messages: [{ role: "user", content: text.trim().slice(0, 500) }],
    });

    const toolUse = response.content.find((b): b is ToolUseBlock => b.type === "tool_use");
    const input = toolUse?.input as
      | {
          detected_language?: "english" | "darija";
          darija_arabic?: string;
          darija_latin?: string;
          english?: string;
          notes?: string;
        }
      | undefined;

    if (!input?.darija_arabic || !input?.darija_latin || !input?.english) {
      return NextResponse.json({ error: "Couldn't translate that — try rephrasing." }, { status: 502 });
    }

    return NextResponse.json({
      detectedLanguage: input.detected_language ?? "darija",
      darijaArabic: input.darija_arabic,
      darijaLatin: input.darija_latin,
      english: input.english,
      notes: input.notes ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "LLM request failed" },
      { status: 502 }
    );
  }
}
