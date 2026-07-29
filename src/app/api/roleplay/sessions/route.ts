import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Phrase } from "@prisma/client";
import type { Tool, ToolUseBlock } from "@anthropic-ai/sdk/resources/messages";
import type { ScriptFormat } from "@/lib/anthropic";
import { getAnthropic, ROLEPLAY_MODEL, NO_THINKING } from "@/lib/anthropic";
import { parseIdArray } from "@/lib/roleplay";

const MAX_TARGET_PHRASES = 6;
const MIN_DUE_BEFORE_BACKFILL = 4;
const MAX_CANDIDATE_POOL = 20;

const SELECT_TOOL: Tool = {
  name: "select_relevant_phrases",
  description: "Select which candidate phrases would naturally fit this roleplay scenario.",
  input_schema: {
    type: "object",
    properties: {
      selected_numbers: {
        type: "array",
        items: { type: "integer" },
        description:
          "1-based numbers of the candidate phrases that would naturally and plausibly come up in this scenario, best fit first. Up to 6.",
      },
    },
    required: ["selected_numbers"],
  },
};

async function resolveSession(session: {
  id: string;
  scenarioId: string;
  scriptFormat: string;
  targetPhraseIds: string;
  usedPhraseIds: string;
  modeledPhraseIds: string;
  createdAt: Date;
}) {
  const targetIds = parseIdArray(session.targetPhraseIds);
  const phrases = await prisma.phrase.findMany({ where: { id: { in: targetIds } } });
  const byId = new Map(phrases.map((p) => [p.id, p]));
  const targetPhrases = targetIds.map((id) => byId.get(id)).filter((p): p is Phrase => !!p);

  return {
    id: session.id,
    scenarioId: session.scenarioId,
    scriptFormat: session.scriptFormat,
    targetPhrases,
    usedPhraseIds: parseIdArray(session.usedPhraseIds),
    modeledPhraseIds: parseIdArray(session.modeledPhraseIds),
    createdAt: session.createdAt,
  };
}

function buildCandidatePool(allPhrases: Phrase[]): Phrase[] {
  const now = new Date();
  const due = allPhrases
    .filter((p) => p.nextReviewAt <= now)
    .sort((a, b) => a.nextReviewAt.getTime() - b.nextReviewAt.getTime());

  const pool = due.slice(0, MAX_CANDIDATE_POOL);

  if (pool.length < MIN_DUE_BEFORE_BACKFILL) {
    const poolIds = new Set(pool.map((p) => p.id));
    const backfillPool = allPhrases
      .filter((p) => !poolIds.has(p.id))
      .sort((a, b) => a.box - b.box || a.nextReviewAt.getTime() - b.nextReviewAt.getTime());

    for (const p of backfillPool) {
      if (pool.length >= MAX_CANDIDATE_POOL) break;
      pool.push(p);
    }
  }

  return pool;
}

function heuristicPick(pool: Phrase[]): Phrase[] {
  return pool.slice(0, MAX_TARGET_PHRASES);
}

async function pickTargetPhrases(
  scenario: { name: string; description: string | null },
  allPhrases: Phrase[]
): Promise<Phrase[]> {
  const pool = buildCandidatePool(allPhrases);
  if (pool.length === 0) return [];
  if (pool.length <= MAX_TARGET_PHRASES) return pool;

  try {
    const anthropic = getAnthropic();
    const candidateList = pool
      .map((p, i) => `${i + 1}. ${p.english} (tag: ${p.tag ?? "none"})`)
      .join("\n");

    const response = await anthropic.messages.create({
      model: ROLEPLAY_MODEL,
      max_tokens: 200,
      thinking: NO_THINKING,
      system:
        "You are helping select which vocabulary a language learner should practice during a specific roleplay scenario. Given the scenario and a numbered list of candidate phrases they're currently working on, pick up to 6 that would naturally and plausibly come up in a real conversation for this scenario — e.g. food words fit a café order, family terms fit meeting a friend's family, bargaining phrases fit haggling at a market. Strongly prefer relevance. If very few candidates are relevant, it's fine to include less-relevant ones to fill out the practice set, but always rank the most relevant ones first. Never invent phrases outside the given list.",
      tools: [SELECT_TOOL],
      tool_choice: { type: "tool", name: "select_relevant_phrases" },
      messages: [
        {
          role: "user",
          content: `Scenario: ${scenario.name} — ${scenario.description ?? ""}\n\nCandidate phrases:\n${candidateList}\n\nSelect up to 6 that fit this scenario, best fit first.`,
        },
      ],
    });

    const toolUse = response.content.find((b): b is ToolUseBlock => b.type === "tool_use");
    const numbers = (toolUse?.input as { selected_numbers?: number[] } | undefined)?.selected_numbers ?? [];

    const selected = numbers
      .map((n) => pool[n - 1])
      .filter((p): p is Phrase => !!p)
      .slice(0, MAX_TARGET_PHRASES);

    return selected.length > 0 ? selected : heuristicPick(pool);
  } catch {
    return heuristicPick(pool);
  }
}

export async function GET(req: NextRequest) {
  const scenarioId = req.nextUrl.searchParams.get("scenarioId");
  if (!scenarioId) {
    return NextResponse.json({ error: "scenarioId is required" }, { status: 400 });
  }

  const session = await prisma.roleplaySession.findFirst({
    where: { scenarioId },
    orderBy: { createdAt: "desc" },
  });

  if (!session) {
    return NextResponse.json(null);
  }

  return NextResponse.json(await resolveSession(session));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { scenarioId, scriptFormat } = body as { scenarioId: string; scriptFormat?: ScriptFormat };

  if (!scenarioId) {
    return NextResponse.json({ error: "scenarioId is required" }, { status: 400 });
  }

  const scenario = await prisma.scenario.findUnique({ where: { id: scenarioId } });
  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  const allPhrases = await prisma.phrase.findMany();
  if (allPhrases.length === 0) {
    return NextResponse.json(
      { error: "Add some phrases in My Phrases first, then come back to practice them here." },
      { status: 400 }
    );
  }

  const targetPhrases = await pickTargetPhrases(scenario, allPhrases);

  const session = await prisma.roleplaySession.create({
    data: {
      scenarioId,
      scriptFormat: scriptFormat === "arabic_script" ? "arabic_script" : "arabizi",
      targetPhraseIds: JSON.stringify(targetPhrases.map((p) => p.id)),
    },
  });

  return NextResponse.json(await resolveSession(session), { status: 201 });
}
