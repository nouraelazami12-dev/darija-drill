# Darija Drill

A personal Moroccan Darija speaking-practice app: log phrases after class, drill them with spaced repetition, and practice live conversations with an LLM roleplay partner.

## Setup

Node is installed via [nvm](https://github.com/nvm-sh/nvm) at `~/.nvm`. If `node`/`npm` aren't on your PATH in a fresh terminal, run:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

(This is already added to `~/.bash_profile` for login shells.)

Install dependencies (already done):

```bash
npm install
```

### Add your Anthropic API key

The Roleplay Chat feature calls the Anthropic API. Get a key from [console.anthropic.com](https://console.anthropic.com/) and add it to `.env`:

```
ANTHROPIC_API_KEY="sk-ant-..."
```

Without a key, everything else (My Phrases, Speaking Drill) works fine — only Roleplay Chat needs it.

### Database

SQLite via Prisma, stored at `prisma/dev.db`. Already migrated and seeded with 5 default roleplay scenarios. If you ever reset the schema:

```bash
npx prisma migrate dev
npm run db:seed
```

## Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — best viewed at phone width, it's mobile-first.

## How it works

- **My Phrases** — add/edit/delete phrases (Arabic script + Latin transliteration + English + optional notes/tag), filter by tag.
- **Speaking Drill** — pulls phrases due today via a 5-box Leitner system (intervals: 1/2/4/7/14 days). Shows the English prompt, 5s countdown, reveals the Darija answer (+ browser TTS), you self-grade Got it/Close/Missed it.
- **Roleplay Chat** — pick a scenario, chat with an LLM playing the other character in Darija (Arabic + Latin), with inline corrections and a hint button.
- **Home** — due count, streak, quick links.
