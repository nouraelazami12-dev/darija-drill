export const BOX_INTERVAL_DAYS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 14,
};

export const MAX_BOX = 5;

export type Grade = "got_it" | "close" | "missed";

export function nextBox(currentBox: number, grade: Grade): number {
  if (grade === "missed") return 1;
  if (grade === "close") return currentBox;
  return Math.min(currentBox + 1, MAX_BOX);
}

export function nextReviewDate(box: number, from: Date = new Date()): Date {
  const days = BOX_INTERVAL_DAYS[box] ?? 1;
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return next;
}
