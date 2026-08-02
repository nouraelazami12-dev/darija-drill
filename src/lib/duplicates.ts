export type PhraseLike = {
  darijaArabic: string | null;
  darijaLatin: string;
};

function normalizeLatin(s: string): string {
  return s.trim().toLowerCase();
}

// Two Arabic scripts only "match" if both are actually present — otherwise
// every phrase with no Arabic script would look like a duplicate of every
// other one.
function arabicMatches(a: string | null, b: string | null): boolean {
  const aNorm = a?.trim();
  const bNorm = b?.trim();
  return !!aNorm && !!bNorm && aNorm === bNorm;
}

export function findMatch<T extends PhraseLike>(
  existing: T[],
  darijaArabic: string | null,
  darijaLatin: string
): T | null {
  const latinNorm = normalizeLatin(darijaLatin);

  return (
    existing.find(
      (p) => arabicMatches(p.darijaArabic, darijaArabic) || normalizeLatin(p.darijaLatin) === latinNorm
    ) ?? null
  );
}

/**
 * Groups phrases that match each other (same rule as findMatch), transitively —
 * if A matches B and B matches C, all three land in one group. Only groups with
 * more than one member are returned.
 */
export function groupDuplicates<T extends PhraseLike & { id: string }>(phrases: T[]): T[][] {
  const parent = new Map<string, string>();

  function find(id: string): string {
    if (!parent.has(id)) parent.set(id, id);
    const p = parent.get(id)!;
    if (p !== id) {
      const root = find(p);
      parent.set(id, root);
      return root;
    }
    return id;
  }

  function union(a: string, b: string) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  for (let i = 0; i < phrases.length; i++) {
    for (let j = i + 1; j < phrases.length; j++) {
      const a = phrases[i];
      const b = phrases[j];
      if (arabicMatches(a.darijaArabic, b.darijaArabic) || normalizeLatin(a.darijaLatin) === normalizeLatin(b.darijaLatin)) {
        union(a.id, b.id);
      }
    }
  }

  const groups = new Map<string, T[]>();
  for (const p of phrases) {
    const root = find(p.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(p);
  }

  return [...groups.values()].filter((g) => g.length > 1);
}
