"use client";

import { useState } from "react";
import type { ChatMessage } from "@/lib/types";

export default function ChatBubble({ message }: { message: ChatMessage }) {
  const [showTranslation, setShowTranslation] = useState(false);
  const isUser = message.role === "user";

  return (
    <div className={`max-w-[85%] space-y-1 ${isUser ? "ml-auto" : "mr-auto"}`}>
      <div
        className={`rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
          isUser ? "bg-primary text-primary-foreground" : "bg-card border border-border"
        }`}
      >
        {message.content}
      </div>
      {!isUser && message.translation && (
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
