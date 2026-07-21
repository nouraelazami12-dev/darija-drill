import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const scenarios = await prisma.scenario.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(scenarios);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const scenario = await prisma.scenario.create({
    data: { name: name.trim(), description: description?.trim() || null, isCustom: true },
  });

  return NextResponse.json(scenario, { status: 201 });
}
