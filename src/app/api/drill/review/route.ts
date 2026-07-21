import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nextBox, nextReviewDate, type Grade } from "@/lib/leitner";
import { recordPracticeToday } from "@/lib/streak";

const VALID_GRADES: Grade[] = ["got_it", "close", "missed"];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { phraseId, grade } = body as { phraseId: string; grade: Grade };

  if (!phraseId || !VALID_GRADES.includes(grade)) {
    return NextResponse.json(
      { error: "phraseId and a valid grade are required" },
      { status: 400 }
    );
  }

  const phrase = await prisma.phrase.findUnique({ where: { id: phraseId } });
  if (!phrase) {
    return NextResponse.json({ error: "Phrase not found" }, { status: 404 });
  }

  const boxBefore = phrase.box;
  const boxAfter = nextBox(boxBefore, grade);
  const nextReviewAt = nextReviewDate(boxAfter);

  const [updatedPhrase] = await Promise.all([
    prisma.phrase.update({
      where: { id: phraseId },
      data: { box: boxAfter, nextReviewAt },
    }),
    prisma.review.create({
      data: { phraseId, grade, boxBefore, boxAfter },
    }),
  ]);

  const streak = await recordPracticeToday();

  return NextResponse.json({ phrase: updatedPhrase, streak });
}
