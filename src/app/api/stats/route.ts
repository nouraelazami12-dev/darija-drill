import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDisplayStreak } from "@/lib/streak";

export async function GET() {
  const [dueCount, totalCount, streak] = await Promise.all([
    prisma.phrase.count({ where: { nextReviewAt: { lte: new Date() } } }),
    prisma.phrase.count(),
    getDisplayStreak(),
  ]);

  return NextResponse.json({ dueCount, totalCount, ...streak });
}
