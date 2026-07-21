export type Phrase = {
  id: string;
  darijaArabic: string;
  darijaLatin: string;
  english: string;
  notes: string | null;
  tag: string | null;
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
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type ExtractedPhrase = {
  darijaArabic: string;
  darijaLatin: string;
  english: string;
  tag?: string;
};
