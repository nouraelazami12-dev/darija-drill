import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type IncomingPhrase = {
  darijaArabic: string;
  darijaLatin: string;
  english: string;
  notes?: string;
  tag?: string;
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { phrases } = body as { phrases: IncomingPhrase[] };

  if (!Array.isArray(phrases) || phrases.length === 0) {
    return NextResponse.json({ error: "phrases must be a non-empty array" }, { status: 400 });
  }

  const valid = phrases.filter(
    (p) => p.darijaArabic?.trim() && p.darijaLatin?.trim() && p.english?.trim()
  );

  if (valid.length === 0) {
    return NextResponse.json(
      { error: "no valid phrases (each needs darijaArabic, darijaLatin, english)" },
      { status: 400 }
    );
  }

  const created = await prisma.$transaction(
    valid.map((p) =>
      prisma.phrase.create({
        data: {
          darijaArabic: p.darijaArabic.trim(),
          darijaLatin: p.darijaLatin.trim(),
          english: p.english.trim(),
          notes: p.notes?.trim() || null,
          tag: p.tag?.trim() || null,
        },
      })
    )
  );

  return NextResponse.json({ created }, { status: 201 });
}
