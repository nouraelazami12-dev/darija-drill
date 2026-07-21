import { prisma } from "@/lib/prisma";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

export async function getStreak() {
  const streak = await prisma.streak.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  return streak;
}

export async function getDisplayStreak() {
  const streak = await getStreak();
  const today = todayStr();

  if (!streak.lastPracticedDate) {
    return { currentStreak: 0, longestStreak: streak.longestStreak, practicedToday: false };
  }

  const gap = daysBetween(streak.lastPracticedDate, today);
  const practicedToday = gap === 0;
  const currentStreak = gap <= 1 ? streak.currentStreak : 0;

  return { currentStreak, longestStreak: streak.longestStreak, practicedToday };
}

export async function recordPracticeToday() {
  const today = todayStr();
  const streak = await getStreak();

  if (streak.lastPracticedDate === today) {
    return streak;
  }

  let currentStreak = 1;
  if (streak.lastPracticedDate) {
    const gap = daysBetween(streak.lastPracticedDate, today);
    currentStreak = gap === 1 ? streak.currentStreak + 1 : 1;
  }

  const longestStreak = Math.max(streak.longestStreak, currentStreak);

  return prisma.streak.update({
    where: { id: 1 },
    data: { currentStreak, longestStreak, lastPracticedDate: today },
  });
}
