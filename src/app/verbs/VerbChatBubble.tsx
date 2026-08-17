"use client";

import { useState } from "react";
import type { VerbPracticeMessage, VerbPracticeMode } from "@/lib/types";

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

export default function VerbChatBubble({
  message,
  mode,
}: {
  message: VerbPracticeMessage;
  mode: VerbPracticeMode;
}) {
  const [showTranslation, setShowTranslation] = useState(false);
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
