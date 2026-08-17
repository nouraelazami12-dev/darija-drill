export type VerbKey = "like" | "khas" | "3nd";

export const VERB_OPTIONS: { key: VerbKey; label: string; hint: string }[] = [
  { key: "like", label: "3jb", hint: "to like (kay3jbni = I like)" },
  { key: "khas", label: "Khas", hint: "to need / must / should" },
  { key: "3nd", label: "3nd", hint: "to have" },
];

export const DEFAULT_VERBS: VerbKey[] = ["like", "khas", "3nd"];

export function isVerbKey(value: string): value is VerbKey {
  return VERB_OPTIONS.some((v) => v.key === value);
}

export type Person = "ana" | "nta" | "nti" | "howa" | "hiya" | "7na" | "ntoma" | "homa";

export const PERSONS: { key: Person; label: string }[] = [
  { key: "ana", label: "ana (I)" },
  { key: "nta", label: "nta (you, masc)" },
  { key: "nti", label: "nti (you, fem)" },
  { key: "howa", label: "howa (he)" },
  { key: "hiya", label: "hiya (she)" },
  { key: "7na", label: "7na (we)" },
  { key: "ntoma", label: "ntoma (you, plural)" },
  { key: "homa", label: "homa (they)" },
];
