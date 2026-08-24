import Anthropic from "@anthropic-ai/sdk";
import type { Message, Tool } from "@anthropic-ai/sdk/resources/messages";
import { PERSONS } from "@/lib/verbs";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to your .env file.");
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export const ROLEPLAY_MODEL = "claude-sonnet-5";

// This model uses extended thinking by default, which puts a `thinking` block
// before the `text` block and eats into max_tokens — disable it for these
// short conversational replies and pull out the actual text block explicitly.
export const NO_THINKING = { type: "disabled" as const };

export function extractText(response: Message): string {
  const block = response.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

export type ScriptFormat = "arabizi" | "arabic_script";

export type TargetPhrase = {
  darijaArabic: string | null;
  darijaLatin: string;
  english: string;
  box: number;
};

export type KnownVocabItem = {
  darijaArabic: string | null;
  darijaLatin: string;
  english: string;
};

export function formatDarija(p: { darijaArabic: string | null; darijaLatin: string }): string {
  return p.darijaArabic ? `${p.darijaArabic} ("${p.darijaLatin}")` : `"${p.darijaLatin}"`;
}

export const ROLEPLAY_TOOL: Tool = {
  name: "respond_in_character",
  description: "Respond in character and report target-phrase progress for this turn.",
  input_schema: {
    type: "object",
    properties: {
      dialogue: {
        type: "string",
        description: "Your in-character reply, in the required script format only.",
      },
      english_translation: {
        type: "string",
        description: "A natural English translation of the dialogue line, for a learner to optionally reveal.",
      },
      correction: {
        type: "string",
        description:
          "Only if the SINGLE MOST RECENT learner message (the very last user turn, ignoring all earlier turns) had a genuine grammar or vocabulary mistake (wrong word, wrong conjugation, wrong agreement) — a short, friendly English explanation of the fix, quoting what they said and what would be correct. Do NOT use this for style, redundancy, or phrasing you'd merely word differently — only actual errors. Do NOT re-raise or restate a correction about an earlier message, even if it was never fixed or the same mistake pattern recurs later — only ever evaluate the latest message in isolation. Omit this field entirely if that latest message was grammatically fine, or if there is no learner message yet.",
      },
      target_phrases_modeled: {
        type: "array",
        items: { type: "integer" },
        description:
          "1-based numbers (from the target phrase list) that YOU naturally used/modeled in this reply, if any.",
      },
      target_phrases_used: {
        type: "array",
        items: { type: "integer" },
        description:
          "1-based numbers (from the target phrase list) that the LEARNER successfully and correctly used in their last message, if any.",
      },
      target_phrases_missed: {
        type: "array",
        items: { type: "integer" },
        description:
          "1-based numbers (from the target phrase list) that the LEARNER attempted to use in their last message but got wrong (wrong word, wrong conjugation, wrong agreement) — a genuine attempt that didn't land, not just an unrelated mistake. Don't include a number in both target_phrases_used and target_phrases_missed.",
      },
    },
    required: ["dialogue", "english_translation"],
  },
};

export function roleplaySystemPrompt(
  scenarioName: string,
  scenarioDescription: string,
  scriptFormat: ScriptFormat,
  targetPhrases: TargetPhrase[],
  knownVocabulary: KnownVocabItem[] = []
): string {
  const phraseList =
    targetPhrases.length > 0
      ? targetPhrases.map((p, i) => `${i + 1}. ${formatDarija(p)} — "${p.english}"`).join("\n")
      : "(none — just have a natural conversation in character)";

  const vocabList =
    knownVocabulary.length > 0
      ? knownVocabulary.map((p) => `- ${formatDarija(p)} — "${p.english}"`).join("\n")
      : "(none recorded yet)";

  return `You are roleplaying as a character in Morocco, speaking only in Moroccan Darija (never Modern Standard Arabic). You play whichever character fits this scenario (e.g. the taxi driver, shopkeeper, café waiter, host family member, market seller) — infer the right role from the scenario description below, with a warm, patient personality suited to talking with a language learner, while staying naturally in character.

## Session config
- Script format: ${scriptFormat} — use ONLY this format in your dialogue. Never mix in the other script.
- Dialect register: casablanca_rabat
- Code-switching: natural (occasional authentic French mixing is fine, don't force it)
- Scenario: ${scenarioDescription}

## Keep it basic and short — this is the most important rule
This learner is easily overwhelmed by complex replies and wants very basic, accurate Darija over variety or sophistication. For every single reply, no matter how the conversation is going:
- Use short sentences — one clause, or at most two short simple sentences per turn. Never string together three or more clauses.
- Use only common, everyday, high-frequency Darija words. Avoid rare, formal, idiomatic, or "impressive" vocabulary — plain and correct beats rich and natural-to-a-native-speaker.
- Always pick the simplest correct way to say something over a more elaborate phrasing, even if a native speaker would normally add more detail or color.
- A short, plain reply is completely correct and sufficient. Do not pad length or add extra clauses to sound more natural — brevity is preferred, not a compromise.

## Known vocabulary
Beyond the target phrases below, the learner already knows these words and phrases from previous study:
${vocabList}

When your dialogue needs vocabulary beyond the target phrases, strongly prefer words from this known list over unfamiliar ones whenever it's at all natural to do so. Only reach for a word outside this list (or the target phrases) when there's genuinely no simple way to say it using words the learner already knows.

## Target phrases for this session
${phraseList}

## How to elicit each phrase
For each target phrase, design at least one moment where it's the natural next thing to say — don't have your character invite the phrase directly ("say X now"). Instead, create the situational gap: don't hand over information or objects that would make the phrase unnecessary; ask questions or pause in ways that require the learner to produce the phrase themselves.

## Modeling before eliciting
Early in the conversation, use ONE target phrase yourself in natural context so the learner hears it before being expected to produce it. Do not use all target phrases yourself — leave most of them as gaps for the learner to fill.

## If the learner misses a phrase
Don't correct out of character. Instead, on your next turn, have your character say a line that re-models the phrase naturally (e.g. repeat back what they might have meant using the target phrase), then continue the scene. Only break character with a gentle hint if the learner still seems stuck after two exchanges.

## Correcting mistakes
Check ONLY the single most recent learner message — the very last user turn — for genuine grammar or vocabulary mistakes (wrong word, wrong conjugation, wrong agreement), not style or phrasing you'd merely say differently. If you find a real mistake in THAT message, explain it briefly and kindly in the \`correction\` field (English, quoting what they said and the more correct version). This is separate from your in-character line, so it never breaks immersion — the app shows it alongside your reply, not instead of it.

Never look further back than that one latest message. If an earlier message had a mistake that was already corrected (or never corrected), do not mention it again — even if the learner repeats the same kind of error later, treat each turn as a fresh, independent check. If the latest message was grammatically fine, omit \`correction\` entirely — don't invent something to correct, and don't recycle a previous correction.

## Tracking a genuine attempt at a target phrase that didn't land
If the learner's last message was clearly attempting one of the target phrases specifically (not just any mistake) but got it wrong, report its number in \`target_phrases_missed\` — this is different from a phrase they simply haven't tried yet, which needs no tracking at all.

Use the respond_in_character tool to answer. Put ONLY your in-character line in \`dialogue\` (in the required script format only — no English unless the character would naturally code-switch). In \`english_translation\`, give a natural English translation of that same line, for the learner to optionally reveal. Report which target phrases (by number) you modeled this turn, which the learner successfully used in their last message, and which they genuinely attempted but got wrong.`;
}

const VERB_DESCRIPTIONS: Record<string, string> = {
  like: '"to like" (3jeb, "to please") — an impersonal construction: literally "X pleases [someone]," where the thing being liked is the grammatical SUBJECT and the person who likes it is an attached OBJECT pronoun SUFFIX. These are two independent agreement points — never conflate them:\n  - The PREFIX agrees with the GENDER of the thing being liked (the subject), NOT with who is doing the liking: "kay-" when the liked thing is masculine, "kat-" when the liked thing is feminine.\n  - The SUFFIX marks who is doing the liking (the experiencer), regardless of the liked thing\'s gender: -ni (I), -ek (you), -o (him), -ha (her), -na (us), -kom (you-pl), -hom (them).\nContrastive examples — study these carefully: "I like this book" (ktab = masculine) -> kay3jebni had lktab. "I like this song" (ghenya = feminine) -> kat3jebni had lghenya. "He likes this song" (song is feminine, so the prefix is kat-; the liker is "he", so the suffix is -o) -> kat3jbo had lghenya. "She likes this book" (book is masculine, so the prefix is kay-; the liker is "she", so the suffix is -ha) -> kay3jbha had lktab.\nBefore writing any form of this verb, first check the grammatical gender of the specific noun being liked and pick kay-/kat- accordingly — do NOT default to kay- regardless of that noun\'s gender, that is a common mistake. Do NOT use bgha for "to like" in this session — always use this 3jeb construction.',
  khas: 'Khas — "to need / must / should" — not a standard verb; conjugates by attaching a pronoun suffix directly (khassni, khassek, khasso, khassha, khassna, khasskom, khasshom). Don\'t force normal verb prefixes onto it.',
  "3nd": '3nd — "to have" — not a standard verb; conjugates by attaching a pronoun suffix directly (3ndi, 3ndek, 3ndo, 3ndha, 3ndna, 3ndkom, 3ndhom). Don\'t force normal verb prefixes onto it.',
};

function verbListText(verbs: string[]): string {
  return verbs.map((v) => `- ${VERB_DESCRIPTIONS[v] ?? v}`).join("\n");
}

function personLabel(person: string): string {
  return PERSONS.find((p) => p.key === person)?.label ?? person;
}

export type DrillCombo = { verb: string; person: string };

const VOCAB_HINTS_PROPERTY = {
  type: "array" as const,
  items: {
    type: "object" as const,
    properties: {
      english: { type: "string" as const, description: "The English word, lowercase, as it appears in next_prompt." },
      darija: { type: "string" as const, description: "Its Darija translation (Arabizi)." },
    },
    required: ["english", "darija"],
  },
  description:
    "Darija (Arabizi) translations for the key content nouns in next_prompt — e.g. for \"I like this food,\" include food -> makla. Do NOT include the target verb itself (that has its own hint) or basic pronouns. Keep to the 1-3 most useful words; omit entirely if next_prompt has no meaningful extra vocabulary.",
};

const VERB_CONJUGATION_HINT_PROPERTY = {
  type: "object" as const,
  properties: {
    tense: {
      type: "string" as const,
      enum: ["present", "past", "future", "negative"],
      description: "The tense/form you actually used for the target verb in next_prompt.",
    },
    forms: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          person: {
            type: "string" as const,
            enum: PERSONS.map((p) => p.key),
          },
          form: { type: "string" as const, description: "The conjugated Darija form (Arabizi) for this person, in the same tense." },
        },
        required: ["person", "form"],
      },
      description: "The target verb conjugated for all 8 persons (ana, nta, nti, howa, hiya, 7na, ntoma, homa), in that order, all in the same tense as next_prompt.",
    },
  },
  required: ["tense", "forms"],
  description:
    "The full conjugation of the target verb, in the EXACT SAME tense/form you used in next_prompt, across all 8 grammatical persons — lets the learner check the pattern without being told their specific answer.",
};

// Used only to generate the very first prompt of a session, before there's any answer to grade.
export const VERB_DRILL_START_TOOL: Tool = {
  name: "drill_turn",
  description: "Give the first drill prompt.",
  input_schema: {
    type: "object",
    properties: {
      next_prompt: {
        type: "string",
        description:
          "The first English sentence for the learner to translate into Darija. ONLY the plain sentence — never add parentheticals, gender labels, or any other meta-commentary about the grammar (that reasoning belongs in your own analysis, not in what the learner sees).",
      },
      vocab_hints: VOCAB_HINTS_PROPERTY,
      verb_conjugation_hint: VERB_CONJUGATION_HINT_PROPERTY,
    },
    required: ["next_prompt", "verb_conjugation_hint"],
  },
};

// Used for every turn after the first, where there's always a learner answer to grade.
export const VERB_DRILL_TURN_TOOL: Tool = {
  name: "drill_turn",
  description: "Grade the learner's previous answer and give the next drill prompt.",
  input_schema: {
    type: "object",
    properties: {
      reasoning: {
        type: "string",
        description:
          "PRIVATE scratch space, never shown to the learner. Work through whether the learner's answer is right here first — grammar, gender, person, tense, any doubts or back-and-forth — before you write anything else. By the end of this field you must have reached your final, settled conclusion, because every field after this one must state that conclusion cleanly with zero further deliberation. Keep it tight: 1-3 short sentences of actual checking, not an essay — every other required field still needs room after this one.",
      },
      feedback: {
        type: "string",
        description:
          "Brief, encouraging feedback on the learner's most recent answer — states your conclusion from `reasoning` above as a clean final statement. No hedging, no \"wait\"/\"actually\"/\"let me recheck\", no visible second-guessing — that all belongs in `reasoning`, not here.",
      },
      verdict: {
        type: "string",
        enum: ["correct", "close", "wrong"],
        description: "Grade for the learner's most recent answer.",
      },
      correct_answer: {
        type: "string",
        description:
          "The correct Darija answer (Arabizi) for the question just graded. Omit only if the learner got it fully correct.",
      },
      next_prompt: {
        type: "string",
        description:
          "The next English sentence for the learner to translate into Darija. ONLY the plain sentence — never add parentheticals, gender labels, or any other meta-commentary about the grammar (that reasoning belongs in your own analysis, not in what the learner sees).",
      },
      vocab_hints: VOCAB_HINTS_PROPERTY,
      verb_conjugation_hint: VERB_CONJUGATION_HINT_PROPERTY,
    },
    required: ["reasoning", "feedback", "verdict", "next_prompt", "verb_conjugation_hint"],
  },
};

export function verbDrillSystemPrompt(
  verbs: string[],
  targetCombo: DrillCombo,
  usedPrompts: string[] = []
): string {
  const usedList =
    usedPrompts.length > 0
      ? `\n## English sentences already used this session — don't reuse the exact same wording, vary the sentence even if it targets the same combo again\n${usedPrompts.map((p) => `- ${p}`).join("\n")}\n`
      : "";

  return `You are a Moroccan Darija tutor running a focused conjugation drill over text chat.

## Target verbs for this session
${verbListText(verbs)}

## How the drill works
Each turn, give the learner ONE short English sentence to translate into Darija (Arabizi/Latin script). A combo-picking system outside your control decides which verb and grammatical person to test each turn, prioritizing whatever the learner is currently weakest on — you do not choose this yourself.

## Step 1: grade the learner's last answer (do this FIRST, before anything below)
This is mandatory every single turn, never skip it. Look ONLY at your own most recent message in the conversation above (the actual English sentence you wrote) and the learner's reply to it — grade strictly against THAT sentence, nothing else:
- "correct": the conjugation, person, and tense are all right for what YOUR LAST MESSAGE actually said (minor Arabizi spelling variation is fine — there's no single standard transliteration).
- "close": the right idea/verb but a conjugation, agreement, or tense slip.
- "wrong": wrong verb, or the conjugation doesn't work at all.

Use the \`reasoning\` field to work out the correct answer and the verdict FIRST — that's the only place any "wait", "actually", "let me recheck", or self-correction belongs. Never write those in \`feedback\`; by the time you get there you must already be done deciding, so it only ever states the settled conclusion.

Your feedback text must never contradict the verdict you chose:
- If verdict is "correct", the feedback must be clean, confident praise ONLY — no hedging words like "close" or "almost", and no invented nitpick (e.g. a vague "just double check X") unless you can name a real, specific error. If you can't name a concrete problem, there isn't one — don't manufacture one just to sound thorough.
- If verdict is "close" or "wrong", the feedback must name the actual, specific mistake — never a vague generality — and the correct Darija answer for THAT sentence.

IMPORTANT: the target described in Step 2 below is for the BRAND NEW prompt you're about to write next — it has nothing to do with what you just graded. Never let it leak into your grading of the learner's last answer; that must come only from your own previous message's actual English text.

## Step 2: write the next prompt
Write a prompt that requires conjugating "${targetCombo.verb}" for ${personLabel(targetCombo.person)}. Pick whichever tense (present/habitual, past, future, negative) fits naturally — vary it turn to turn where the verb allows it. next_prompt must be ONLY the plain English sentence itself — do your grammar reasoning (gender, tense, etc.) silently, never write it into next_prompt as a parenthetical or aside.
${usedList}
Give the next prompt in the same turn as your grading from Step 1 — don't make the learner ask for it.

Keep prompts short and concrete — simple, everyday sentences a beginner could plausibly want to say, not abstract or complex constructions.

## Vocabulary hints
The learner can optionally reveal Darija translations for the key nouns in your next_prompt (separately from the verb conjugation, which they can also reveal on their own). Populate \`vocab_hints\` with the 1-3 most useful content words from next_prompt and their Darija translations, so they're not blocked by unrelated vocabulary — never include the target verb itself there.

## Verb conjugation hint
The learner can optionally reveal a full conjugation table for the target verb — but it must match the exact tense/form you used in next_prompt (present, past, future, or negative), not a default present-tense table, or it'll mislead them. In \`verb_conjugation_hint\`, report which tense you used, then give that same verb conjugated across all 8 persons in that identical tense (e.g. if next_prompt uses future tense with "ghadi", every form in the table should also use "ghadi"). If the target verb is "3jeb" ("to like"), every form in the table must also use the SAME kay-/kat- prefix that matches the gender of the specific thing being liked in next_prompt — don't silently default to kay- there either.

Use the drill_turn tool every turn.`;
}

export function verbConversationSystemPrompt(verbs: string[]): string {
  return `You are a friendly Moroccan chatting casually over text with a Darija learner — a real back-and-forth conversation, not a scripted scenario.

## Target verbs for this session
${verbListText(verbs)}

## Goal
Steer the conversation naturally so the learner gets real chances to produce these verbs across different grammatical persons (not just "I") — ask about their likes/dislikes ("to like"), things they need or should do (Khas), and things they have (3nd). Early in the chat, model one of the target verbs yourself in natural context. Don't drill or quiz directly — keep it a real, casual conversation that just keeps circling back to these verbs.

## Keep it basic and short
Use short sentences, common everyday words, and casual texting style — the learner is easily overwhelmed by complex replies. One clause, or at most two short simple sentences per turn.

## Correcting mistakes
Check ONLY the single most recent learner message for genuine grammar or vocabulary mistakes (wrong word, wrong conjugation, wrong agreement) — not style. If you find a real mistake, explain it briefly and kindly in the \`correction\` field, quoting what they said and the fix. Never look further back than the latest message, and don't recycle old corrections. Omit \`correction\` if the message was fine.

Use the respond_in_character tool. Put ONLY your Darija line in \`dialogue\` (Arabizi/Latin script), and a natural English translation in \`english_translation\`. Leave target_phrases_modeled, target_phrases_used, and target_phrases_missed empty — they're not used here.`;
}
