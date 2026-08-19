"use client";

import { useState } from "react";
import type { VerbConjugationHint, VerbPracticeMessage, VerbPracticeMode } from "@/lib/types";
import { VERB_CONJUGATIONS, PERSONS, VERB_OPTIONS, isVerbKey } from "@/lib/verbs";

const TENSE_LABEL: Record<string, string> = {
  present: "present tense",
  past: "past tense",
  future: "future tense",
  negative: "negative form",
};

function personLabel(person: string): string {
  return PERSONS.find((p) => p.key === person)?.label ?? person;
}

const VERDICT_STYLE: Record<string, string> = {
  correct: "border-success/40 bg-success/10 text-success",
  close: "border-warning/40 bg-warning/10 text-warning",
  wrong: "border-danger/40 bg-danger/10 text-danger",
};

const VERDICT_LABEL: Record<string, string> = {
  correct: "✅ Correct",
  close: "🟡 Close",
  wrong: "❌ Not quite",
};

function VerbHintTable({ verb, hint }: { verb: string; hint: VerbConjugationHint | null }) {
  const label = VERB_OPTIONS.find((v) => v.key === verb)?.label ?? verb;

  // Prefer the model's tense-matched table (matches whatever tense the prompt actually used).
  // Fall back to the hardcoded present-tense table for older messages saved before this existed.
  if (hint && hint.forms.length > 0) {
    return (
      <div className="rounded-xl bg-border/40 px-3 py-2 text-xs text-foreground">
        <p className="mb-1 font-semibold">
          {label} — {TENSE_LABEL[hint.tense] ?? hint.tense}
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {hint.forms.map((f) => (
            <p key={f.person}>
              <span className="text-muted">{personLabel(f.person)}: </span>
              {f.form}
            </p>
          ))}
        </div>
      </div>
    );
  }

  if (!isVerbKey(verb)) return null;
  const table = VERB_CONJUGATIONS[verb];

  return (
    <div className="rounded-xl bg-border/40 px-3 py-2 text-xs text-foreground">
      <p className="mb-1 font-semibold">{label} — present tense</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {PERSONS.map((p) => (
          <p key={p.key}>
            <span className="text-muted">{p.label}: </span>
            {table[p.key]}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function VerbChatBubble({
  message,
  mode,
}: {
  message: VerbPracticeMessage;
  mode: VerbPracticeMode;
}) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [showVerbHint, setShowVerbHint] = useState(false);
  const [showWordHints, setShowWordHints] = useState(false);
  const isUser = message.role === "user";

  return (
    <div className={`max-w-[85%] space-y-1 ${isUser ? "ml-auto" : "mr-auto"}`}>
      {!isUser && mode === "drill" && message.verdict && (
        <p
          className={`rounded-xl border px-3 py-2 text-xs ${VERDICT_STYLE[message.verdict] ?? ""}`}
        >
          <span className="font-semibold">{VERDICT_LABEL[message.verdict] ?? message.verdict}</span>
          {message.feedback && <span> — {message.feedback}</span>}
          {message.correctAnswer && (
            <span className="mt-1 block font-medium">Correct answer: {message.correctAnswer}</span>
          )}
        </p>
      )}
      <div
        className={`rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
          isUser ? "bg-primary text-primary-foreground" : "bg-card border border-border"
        }`}
      >
        {message.content}
      </div>
      {!isUser && mode === "drill" && message.targetVerb && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowVerbHint((s) => !s)}
            className="px-1 text-xs font-medium text-muted underline"
          >
            {showVerbHint ? "Hide verb hint" : "💡 Verb hint"}
          </button>
          {message.vocabHints && message.vocabHints.length > 0 && (
            <button
              onClick={() => setShowWordHints((s) => !s)}
              className="px-1 text-xs font-medium text-muted underline"
            >
              {showWordHints ? "Hide word hints" : "📖 Word hints"}
            </button>
          )}
        </div>
      )}
      {!isUser && mode === "drill" && showVerbHint && message.targetVerb && (
        <VerbHintTable verb={message.targetVerb} hint={message.verbHint} />
      )}
      {!isUser && mode === "drill" && showWordHints && message.vocabHints && (
        <div className="rounded-xl bg-border/40 px-3 py-2 text-xs text-foreground">
          {message.vocabHints.map((h, i) => (
            <p key={i}>
              <span className="text-muted">{h.english}: </span>
              {h.darija}
            </p>
          ))}
        </div>
      )}
      {!isUser && mode === "conversation" && message.correction && (
        <p className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
          <span className="font-semibold text-warning">Correction: </span>
          {message.correction}
        </p>
      )}
      {!isUser && mode === "conversation" && message.translation && (
        <div>
          {showTranslation ? (
            <p className="rounded-xl bg-border/40 px-3 py-2 text-xs italic text-muted">
              {message.translation}
            </p>
          ) : (
            <button
              onClick={() => setShowTranslation(true)}
              className="px-1 text-xs font-medium text-muted underline"
            >
              Show translation
            </button>
          )}
        </div>
      )}
    </div>
  );
}
