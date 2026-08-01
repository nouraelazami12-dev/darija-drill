import Anthropic from "@anthropic-ai/sdk";
import type { Message, Tool } from "@anthropic-ai/sdk/resources/messages";

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
  darijaArabic: string;
  darijaLatin: string;
  english: string;
  box: number;
};

export type KnownVocabItem = {
  darijaArabic: string;
  darijaLatin: string;
  english: string;
};

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
          "Only if the learner's last message had a genuine grammar or vocabulary mistake (wrong word, wrong conjugation, wrong agreement) — a short, friendly English explanation of the fix, quoting what they said and what would be correct. Do NOT use this for style, redundancy, or phrasing you'd merely word differently — only actual errors. Omit this field entirely if their message was grammatically fine, or if there is no learner message yet.",
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
      ? targetPhrases
          .map((p, i) => `${i + 1}. ${p.darijaArabic} ("${p.darijaLatin}") — "${p.english}"`)
          .join("\n")
      : "(none — just have a natural conversation in character)";

  const vocabList =
    knownVocabulary.length > 0
      ? knownVocabulary.map((p) => `- ${p.darijaArabic} ("${p.darijaLatin}") — "${p.english}"`).join("\n")
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
Check the learner's last message for genuine grammar or vocabulary mistakes only (wrong word, wrong conjugation, wrong agreement) — not style or phrasing you'd merely say differently. If you find a real mistake, explain it briefly and kindly in the \`correction\` field (English, quoting what they said and the more correct version). This is separate from your in-character line, so it never breaks immersion — the app shows it alongside your reply, not instead of it. If their message was grammatically fine, or there is no learner message yet, omit \`correction\` entirely — don't invent something to correct.

Use the respond_in_character tool to answer. Put ONLY your in-character line in \`dialogue\` (in the required script format only — no English unless the character would naturally code-switch). In \`english_translation\`, give a natural English translation of that same line, for the learner to optionally reveal. Report which target phrases (by number) you modeled this turn and which the learner successfully used in their last message.`;
}
