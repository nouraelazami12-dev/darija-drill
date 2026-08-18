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

// Present-tense conjugation for each target verb, one form per grammatical person.
// "like" and "3nd"/"khas" all use the same object/possessive suffix for nta and nti
// (Darija doesn't mark gender on these suffixes), matching the descriptions used
// to prompt the model elsewhere so hints never contradict what the drill grades as correct.
export const VERB_CONJUGATIONS: Record<VerbKey, Record<Person, string>> = {
  like: {
    ana: "kay3jbni",
    nta: "kay3jbek",
    nti: "kay3jbek",
    howa: "kay3jbo",
    hiya: "kay3jbha",
    "7na": "kay3jbna",
    ntoma: "kay3jbkom",
    homa: "kay3jbhom",
  },
  khas: {
    ana: "khassni",
    nta: "khassek",
    nti: "khassek",
    howa: "khasso",
    hiya: "khassha",
    "7na": "khassna",
    ntoma: "khasskom",
    homa: "khasshom",
  },
  "3nd": {
    ana: "3ndi",
    nta: "3ndek",
    nti: "3ndek",
    howa: "3ndo",
    hiya: "3ndha",
    "7na": "3ndna",
    ntoma: "3ndkom",
    homa: "3ndhom",
  },
};
