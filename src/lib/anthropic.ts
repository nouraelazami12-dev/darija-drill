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

function deriveLearnerLevel(targetPhrases: TargetPhrase[]): "beginner" | "intermediate" | "advanced" {
  if (targetPhrases.length === 0) return "beginner";
  const avgBox = targetPhrases.reduce((sum, p) => sum + p.box, 0) / targetPhrases.length;
  if (avgBox <= 2) return "beginner";
  if (avgBox <= 3.5) return "intermediate";
  return "advanced";
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
  targetPhrases: TargetPhrase[]
): string {
  const level = deriveLearnerLevel(targetPhrases);
  const phraseList =
    targetPhrases.length > 0
      ? targetPhrases
          .map((p, i) => `${i + 1}. ${p.darijaArabic} ("${p.darijaLatin}") — "${p.english}"`)
          .join("\n")
      : "(none — just have a natural conversation in character)";

  return `You are roleplaying as a character in Morocco, speaking only in Moroccan Darija (never Modern Standard Arabic). You play whichever character fits this scenario (e.g. the taxi driver, shopkeeper, café waiter, host family member, market seller) — infer the right role from the scenario description below, with a warm, patient personality suited to talking with a language learner, while staying naturally in character.

## Session config
- Learner level: ${level}
- Script format: ${scriptFormat} — use ONLY this format in your dialogue. Never mix in the other script.
- Dialect register: casablanca_rabat
- Code-switching: natural (occasional authentic French mixing is fine, don't force it)
- Scenario: ${scenarioDescription}

## Target phrases for this session
${phraseList}

## How to elicit each phrase
For each target phrase, design at least one moment where it's the natural next thing to say — don't have your character invite the phrase directly ("say X now"). Instead, create the situational gap: don't hand over information or objects that would make the phrase unnecessary; ask questions or pause in ways that require the learner to produce the phrase themselves.

## Modeling before eliciting
Early in the conversation, use ONE target phrase yourself in natural context so the learner hears it before being expected to produce it. Do not use all target phrases yourself — leave most of them as gaps for the learner to fill.

## If the learner misses a phrase
Don't correct out of character. Instead, on your next turn, have your character say a line that re-models the phrase naturally (e.g. repeat back what they might have meant using the target phrase), then continue the scene. Only break character with a gentle hint if the learner still seems stuck after two exchanges.

Keep replies short and conversational, like real spoken Darija, not formal writing. After your in-character reply, if the learner's last message had a grammar or vocabulary error, you may include a short "Correction:" line in English explaining the fix — otherwise omit it.

Use the respond_in_character tool to answer. Put ONLY your in-character line in \`dialogue\` (in the required script format only — no English unless the character would naturally code-switch). In \`english_translation\`, give a natural English translation of that same line — this is shown to the learner only if they choose to reveal it, so it should stand alone (translate any "Correction:" line too, if present). Report which target phrases (by number) you modeled this turn and which the learner successfully used in their last message.`;
}
