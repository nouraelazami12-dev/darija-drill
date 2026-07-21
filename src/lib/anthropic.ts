import Anthropic from "@anthropic-ai/sdk";

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

export function roleplaySystemPrompt(scenarioName: string, scenarioDescription: string) {
  return `You are roleplaying as a character in Morocco speaking only in Moroccan Darija (never Modern Standard Arabic or French, unless the scenario naturally calls for occasional French code-switching, which is authentic). Always write your Darija reply in both Arabic script and Latin/Arabizi transliteration. Stay fully in character for the given scenario. After your in-character reply, if the user's last message had a grammar or vocabulary error, add a short "Correction:" line in English explaining the fix — otherwise omit this line. Keep replies short and conversational, like real spoken Darija, not formal writing.

Scenario: ${scenarioName}
Scenario details: ${scenarioDescription}`;
}
