import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const tag = req.nextUrl.searchParams.get("tag");
  const phrases = await prisma.phrase.findMany({
    where: tag ? { tag } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(phrases);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { darijaArabic, darijaLatin, english, notes, tag } = body;

  if (!darijaArabic?.trim() || !darijaLatin?.trim() || !english?.trim()) {
    return NextResponse.json(
      { error: "darijaArabic, darijaLatin, and english are required" },
      { status: 400 }
    );
  }

  const phrase = await prisma.phrase.create({
    data: {
      darijaArabic: darijaArabic.trim(),
      darijaLatin: darijaLatin.trim(),
      english: english.trim(),
      notes: notes?.trim() || null,
      tag: tag?.trim() || null,
    },
  });

  return NextResponse.json(phrase, { status: 201 });
}
