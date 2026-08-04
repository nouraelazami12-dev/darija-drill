import { NextRequest, NextResponse } from "next/server";
import type {
  MessageParam,
  Tool,
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/messages";
import { getAnthropic, ROLEPLAY_MODEL, NO_THINKING } from "@/lib/anthropic";
import { prisma } from "@/lib/prisma";
import { findMatch } from "@/lib/duplicates";

const MAX_PDF_BYTES = 15 * 1024 * 1024;

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
            darijaArabic: {
              type: "string",
              description: "The phrase in Arabic script, if the source has it or you're confident in the spelling. Omit if unsure.",
            },
            darijaLatin: { type: "string", description: "The phrase in Latin/Arabizi transliteration." },
            english: { type: "string", description: "The English meaning." },
            tag: {
              type: "string",
              description: "A short topic tag if obvious from context (e.g. 'taxi', 'greetings', 'numbers'), otherwise omit.",
            },
          },
          required: ["darijaLatin", "english"],
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
  const contentType = req.headers.get("content-type") ?? "";
  let content: MessageParam["content"];

  if (contentType.startsWith("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.type !== "application/pdf") {
      return NextResponse.json({ error: "a PDF file is required" }, { status: 400 });
    }
    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: "That PDF is too large (max 15MB) — try a smaller file or paste the text instead." },
        { status: 400 }
      );
    }

    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    content = [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
      { type: "text", text: "Extract every Darija phrase from this document." },
    ];
  } else {
    const body = await req.json();
    const { text } = body as { text: string };

    if (!text?.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    content = text.slice(0, 100_000);
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
      messages: [{ role: "user", content }],
    });

    const toolUse = response.content.find(
      (b): b is ToolUseBlock => b.type === "tool_use"
    );
    type Extracted = { darijaArabic?: string; darijaLatin: string; english: string; tag?: string };
    const rawPhrases = (toolUse?.input as { phrases?: unknown } | undefined)?.phrases;
    const phrases: Extracted[] = Array.isArray(rawPhrases) ? rawPhrases : [];

    const existing = await prisma.phrase.findMany({
      select: { darijaArabic: true, darijaLatin: true },
    });
    const annotated = phrases.map((p) => ({
      ...p,
      isDuplicate: !!findMatch(existing, p.darijaArabic ?? null, p.darijaLatin ?? ""),
    }));

    return NextResponse.json({ phrases: annotated });
  } catch (err) {
    console.error("phrases/extract failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "LLM request failed" },
      { status: 502 }
    );
  }
}
