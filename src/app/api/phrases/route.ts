import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findMatch } from "@/lib/duplicates";

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
  const { darijaArabic, darijaLatin, english, notes, tag, force } = body;

  if (!darijaLatin?.trim() || !english?.trim()) {
    return NextResponse.json(
      { error: "darijaLatin and english are required" },
      { status: 400 }
    );
  }

  if (!force) {
    const existing = await prisma.phrase.findMany({
      select: { darijaArabic: true, darijaLatin: true, english: true },
    });
    const match = findMatch(existing, darijaArabic?.trim() || null, darijaLatin);
    if (match) {
      return NextResponse.json(
        { duplicate: { darijaLatin: match.darijaLatin, english: match.english } },
        { status: 409 }
      );
    }
  }

  const phrase = await prisma.phrase.create({
    data: {
      darijaArabic: darijaArabic?.trim() || null,
      darijaLatin: darijaLatin.trim(),
      english: english.trim(),
      notes: notes?.trim() || null,
      tag: tag?.trim() || null,
    },
  });

  return NextResponse.json(phrase, { status: 201 });
}
