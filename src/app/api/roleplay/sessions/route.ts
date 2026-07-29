import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Phrase } from "@prisma/client";
import type { ScriptFormat } from "@/lib/anthropic";
import { parseIdArray } from "@/lib/roleplay";

const MAX_TARGET_PHRASES = 6;
const MIN_DUE_BEFORE_BACKFILL = 4;

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

function pickTargetPhrases(allPhrases: Phrase[]): Phrase[] {
  const now = new Date();
  const due = allPhrases
    .filter((p) => p.nextReviewAt <= now)
    .sort((a, b) => a.nextReviewAt.getTime() - b.nextReviewAt.getTime());

  const selected = due.slice(0, MAX_TARGET_PHRASES);

  if (selected.length < MIN_DUE_BEFORE_BACKFILL) {
    const selectedIds = new Set(selected.map((p) => p.id));
    const backfillPool = allPhrases
      .filter((p) => !selectedIds.has(p.id))
      .sort((a, b) => a.box - b.box || a.nextReviewAt.getTime() - b.nextReviewAt.getTime());

    for (const p of backfillPool) {
      if (selected.length >= MAX_TARGET_PHRASES) break;
      selected.push(p);
    }
  }

  return selected;
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

  const targetPhrases = pickTargetPhrases(allPhrases);

  const session = await prisma.roleplaySession.create({
    data: {
      scenarioId,
      scriptFormat: scriptFormat === "arabic_script" ? "arabic_script" : "arabizi",
      targetPhraseIds: JSON.stringify(targetPhrases.map((p) => p.id)),
    },
  });

  return NextResponse.json(await resolveSession(session), { status: 201 });
}
