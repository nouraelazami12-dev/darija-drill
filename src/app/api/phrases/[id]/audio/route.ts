import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

const AUDIO_DIR = path.join(process.cwd(), "public", "uploads", "audio");

const EXTENSION_BY_MIME: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

async function removeExistingAudioFiles(phraseId: string) {
  let files: string[];
  try {
    files = await fs.readdir(AUDIO_DIR);
  } catch {
    return;
  }
  await Promise.all(
    files
      .filter((f) => f.startsWith(`${phraseId}.`))
      .map((f) => fs.unlink(path.join(AUDIO_DIR, f)).catch(() => {}))
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const phrase = await prisma.phrase.findUnique({ where: { id } });
  if (!phrase) {
    return NextResponse.json({ error: "Phrase not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("audio");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "audio file is required" }, { status: 400 });
  }

  const ext = EXTENSION_BY_MIME[file.type] || path.extname(file.name).replace(".", "") || "webm";
  const buffer = Buffer.from(await file.arrayBuffer());

  await fs.mkdir(AUDIO_DIR, { recursive: true });
  await removeExistingAudioFiles(id);
  await fs.writeFile(path.join(AUDIO_DIR, `${id}.${ext}`), buffer);

  const audioUrl = `/uploads/audio/${id}.${ext}?v=${Date.now()}`;
  const updated = await prisma.phrase.update({ where: { id }, data: { audioUrl } });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const phrase = await prisma.phrase.findUnique({ where: { id } });
  if (!phrase) {
    return NextResponse.json({ error: "Phrase not found" }, { status: 404 });
  }

  await removeExistingAudioFiles(id);
  const updated = await prisma.phrase.update({ where: { id }, data: { audioUrl: null } });

  return NextResponse.json(updated);
}
