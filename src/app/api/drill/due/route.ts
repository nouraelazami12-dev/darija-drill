import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const phrases = await prisma.phrase.findMany({
    where: { nextReviewAt: { lte: new Date() } },
    orderBy: { nextReviewAt: "asc" },
  });
  return NextResponse.json(phrases);
}
