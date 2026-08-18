export type Phrase = {
  id: string;
  darijaArabic: string | null;
  darijaLatin: string;
  english: string;
  notes: string | null;
  tag: string | null;
  audioUrl: string | null;
  box: number;
  nextReviewAt: string;
  createdAt: string;
  updatedAt: string;
};

export type Scenario = {
  id: string;
  name: string;
  description: string | null;
  isCustom: boolean;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  scenarioId: string;
  sessionId: string | null;
  role: "user" | "assistant";
  content: string;
  translation: string | null;
  correction: string | null;
  createdAt: string;
};

export type RoleplaySession = {
  id: string;
  scenarioId: string;
  scriptFormat: "arabizi" | "arabic_script";
  targetPhrases: Phrase[];
  usedPhraseIds: string[];
  modeledPhraseIds: string[];
  createdAt: string;
};

export type VerbPracticeMode = "drill" | "conversation";

export type VocabHint = { english: string; darija: string };

export type VerbPracticeMessage = {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  translation: string | null;
  correction: string | null;
  feedback: string | null;
  verdict: "correct" | "close" | "wrong" | null;
  correctAnswer: string | null;
  targetVerb: string | null;
  targetPerson: string | null;
  vocabHints: VocabHint[] | null;
  createdAt: string;
};

export type VerbPracticeSession = {
  id: string;
  verbs: string[];
  mode: VerbPracticeMode;
  createdAt: string;
};

export type ExtractedPhrase = {
  darijaArabic?: string;
  darijaLatin: string;
  english: string;
  tag?: string;
  isDuplicate?: boolean;
};
