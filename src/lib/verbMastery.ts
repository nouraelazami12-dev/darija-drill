import { prisma } from "@/lib/prisma";
import { PERSONS, type Person } from "@/lib/verbs";

const MAX_STRENGTH = 5;
const CANDIDATE_POOL_SIZE = 4;

export type DrillVerdict = "correct" | "close" | "wrong";

function nextStrength(current: number, verdict: DrillVerdict): number {
  if (verdict === "correct") return Math.min(current + 1, MAX_STRENGTH);
  if (verdict === "close") return Math.max(current - 1, 0);
  return 0;
}

// Update the mastery record for the combo the learner just answered.
export async function gradeCombo(verb: string, person: string, verdict: DrillVerdict) {
  const existing = await prisma.verbMastery.findUnique({
    where: { verb_person: { verb, person } },
  });

  const strength = nextStrength(existing?.strength ?? 0, verdict);
  const attempts = (existing?.attempts ?? 0) + 1;
  const correct = (existing?.correct ?? 0) + (verdict === "correct" ? 1 : 0);

  await prisma.verbMastery.upsert({
    where: { verb_person: { verb, person } },
    update: { strength, attempts, correct, lastResult: verdict },
    create: { verb, person, strength, attempts, correct, lastResult: verdict },
  });
}

// Pick the next (verb, person) combo to drill: weighted toward weakest and least-recently-seen,
// with light randomness among the bottom few so it doesn't robotically hammer a single worst combo.
export async function pickNextCombo(
  verbs: string[]
): Promise<{ verb: string; person: Person }> {
  const rows = await prisma.verbMastery.findMany({ where: { verb: { in: verbs } } });
  const byKey = new Map(rows.map((r) => [`${r.verb}:${r.person}`, r]));

  // Iterate persons outer, verbs inner, so untouched combos (all tied at strength 0 / never
  // practiced) naturally interleave across verbs instead of exhausting one verb before the next.
  const combos = PERSONS.flatMap((p) =>
    verbs.map((verb) => {
      const row = byKey.get(`${verb}:${p.key}`);
      return {
        verb,
        person: p.key,
        strength: row?.strength ?? 0,
        lastPracticed: row?.updatedAt?.getTime() ?? 0,
      };
    })
  );

  combos.sort((a, b) => a.strength - b.strength || a.lastPracticed - b.lastPracticed);

  const pool = combos.slice(0, Math.min(CANDIDATE_POOL_SIZE, combos.length));
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return { verb: pick.verb, person: pick.person };
}
