export type VerbKey = "like" | "khas" | "3nd";

export const VERB_OPTIONS: { key: VerbKey; label: string; hint: string }[] = [
  { key: "like", label: "to like", hint: "kay3jeb (kay3jbni = I like)" },
  { key: "khas", label: "Khas", hint: "to need / must / should" },
  { key: "3nd", label: "3nd", hint: "to have" },
];

export const DEFAULT_VERBS: VerbKey[] = ["like", "khas", "3nd"];

export function isVerbKey(value: string): value is VerbKey {
  return VERB_OPTIONS.some((v) => v.key === value);
}
