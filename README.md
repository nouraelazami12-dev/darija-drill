# Learn Darija

A personal Moroccan Darija speaking-practice app: log phrases after class, drill them with spaced repetition, practice live conversations with an LLM roleplay partner, and import new vocabulary straight from class slides or transcripts.

This runs entirely on your own machine — your phrases, chat history, and any audio you record stay local to you. Each person who wants to use it should set up their own copy following the steps below (it doesn't support multiple people sharing one running copy).

## Setup

### 1. Install Node.js

You need Node 20+. If you don't have it, the easiest way is [nvm](https://github.com/nvm-sh/nvm):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install --lts
```

Check it worked: `node -v`

### 2. Install dependencies

From the project folder:

```bash
npm install
```

### 3. Set up your `.env`

Copy the example file:

```bash
cp .env.example .env
```

Then add your own Anthropic API key (needed only for Roleplay Chat and the phrase-import feature — My Phrases and Speaking Drill work without it):

1. Get a key at [console.anthropic.com](https://console.anthropic.com/) (pay-as-you-go; a small prepaid credit is required).
2. Open `.env` and set:
   ```
   ANTHROPIC_API_KEY="sk-ant-your-key-here"
   ```

Don't commit `.env` or share your key — it's already gitignored.

### 4. Set up the database

Each person gets their own local SQLite database, seeded with the 5 default roleplay scenarios:

```bash
npx prisma migrate dev
npm run db:seed
```

## Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it's mobile-first, so it's worth trying at phone width (or on your phone, via your computer's local network address, which `npm run dev` prints on startup).

## How it works

- **My Phrases** — add/edit/delete phrases (Arabic script + Latin transliteration + English + optional notes/tag), filter by tag. Each phrase can have your own recorded or uploaded audio attached (mic recording or file upload) — Speaking Drill only offers playback when audio is actually attached. Adding, editing, or importing a phrase that looks like a repeat (same Arabic script or matching Latin spelling) warns you before saving a duplicate, and a "Find duplicates" view scans your whole library for existing repeats.
- **Import** — paste text, or upload a `.txt`/`.vtt` transcript or a PDF (slides, handouts), and Claude extracts Darija/English phrase pairs for you to review and edit before saving.
- **Speaking Drill** — pulls phrases due today via a 5-box Leitner system (intervals: 1/2/4/7/14 days). Shows the English prompt, 5s countdown, reveals the Darija answer, you self-grade Got it/Close/Missed it.
- **Roleplay Chat** — pick a scenario and start a session; the app picks a handful of phrases you're already practicing (due for review, or newest/least-mastered) and the LLM naturally works them into the conversation as the other character, modeling each phrase before expecting you to use it. Successfully using one advances its spaced-repetition box and your streak, same as Speaking Drill. A "Practicing this session" panel tracks used/modeled/pending phrases, "New session" re-picks a fresh set, and a hint button nudges you toward phrases you haven't used yet.
- **Home** — due count, streak, quick links.

## Notes for sharing with friends

- Everyone needs their own Anthropic API key and pays for their own usage (typically cents to low dollars a month for casual use).
- There's no login/accounts — this is a single-user app per installation, so each friend runs their own copy with their own data.
- If you update your copy later (new features, fixes), friends won't get them automatically — you'd need to share the updated code again (e.g. via a shared git repo).
