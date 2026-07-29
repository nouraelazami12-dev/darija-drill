import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { groupDuplicates } from "@/lib/duplicates";

export async function GET() {
  const phrases = await prisma.phrase.findMany({ orderBy: { createdAt: "asc" } });
  const groups = groupDuplicates(phrases);
  return NextResponse.json({ groups });
}
