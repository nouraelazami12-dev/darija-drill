import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages";

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

export function roleplaySystemPrompt(scenarioName: string, scenarioDescription: string) {
  return `You are roleplaying as a character in Morocco speaking only in Moroccan Darija (never Modern Standard Arabic or French, unless the scenario naturally calls for occasional French code-switching, which is authentic). Always write your Darija reply in both Arabic script and Latin/Arabizi transliteration. Stay fully in character for the given scenario. After your in-character reply, if the user's last message had a grammar or vocabulary error, add a short "Correction:" line in English explaining the fix — otherwise omit this line. Keep replies short and conversational, like real spoken Darija, not formal writing.

Scenario: ${scenarioName}
Scenario details: ${scenarioDescription}`;
}
