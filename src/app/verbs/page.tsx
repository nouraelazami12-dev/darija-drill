"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card } from "@/components/ui";
import VerbChatBubble from "./VerbChatBubble";
import { VERB_OPTIONS, DEFAULT_VERBS, type VerbKey } from "@/lib/verbs";
import type { VerbPracticeMessage, VerbPracticeMode, VerbPracticeSession } from "@/lib/types";

function VerbPicker({
  selected,
  onToggle,
}: {
  selected: VerbKey[];
  onToggle: (key: VerbKey) => void;
}) {
  return (
    <div className="space-y-1.5">
      {VERB_OPTIONS.map((v) => (
        <label
          key={v.key}
          className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
        >
          <input
            type="checkbox"
            checked={selected.includes(v.key)}
            onChange={() => onToggle(v.key)}
            className="h-4 w-4 shrink-0 accent-primary"
          />
          <span>
            <span className="font-medium">{v.label}</span>{" "}
            <span className="text-xs text-muted">({v.hint})</span>
          </span>
        </label>
      ))}
    </div>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: VerbPracticeMode;
  onChange: (mode: VerbPracticeMode) => void;
}) {
  return (
    <div className="flex gap-1.5">
      <button
        onClick={() => onChange("drill")}
        className={`rounded-full px-3 py-1.5 text-xs font-medium ${
          mode === "drill" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted"
        }`}
      >
        Prompt-and-answer drill
      </button>
      <button
        onClick={() => onChange("conversation")}
        className={`rounded-full px-3 py-1.5 text-xs font-medium ${
          mode === "conversation"
            ? "bg-primary text-primary-foreground"
            : "bg-card border border-border text-muted"
        }`}
      >
        Natural conversation
      </button>
    </div>
  );
}

export default function VerbPracticePage() {
  const [session, setSession] = useState<VerbPracticeSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [selectedVerbs, setSelectedVerbs] = useState<VerbKey[]>(DEFAULT_VERBS);
  const [mode, setMode] = useState<VerbPracticeMode>("drill");
  const [starting, setStarting] = useState(false);
  const [confirmNewSession, setConfirmNewSession] = useState(false);

  const [messages, setMessages] = useState<VerbPracticeMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hideVerbs, setHideVerbs] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/verb-practice/sessions")
      .then((res) => res.json())
      .then((data) => {
        setSession(data);
        setSessionLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!session) return;
    fetch(`/api/verb-practice/messages?sessionId=${session.id}`)
      .then((res) => res.json())
      .then(setMessages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleVerb = (key: VerbKey) => {
    setSelectedVerbs((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const startSession = async () => {
    if (selectedVerbs.length === 0) return;
    setError(null);
    setStarting(true);
    try {
      const res = await fetch("/api/verb-practice/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verbs: selectedVerbs, mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setMessages([]);
      setSession(data);
      setConfirmNewSession(false);
    } finally {
      setStarting(false);
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending || !session) return;
    setError(null);
    setInput("");
    setSending(true);

    setMessages((prev) => [
      ...prev,
      {
        id: `tmp-${Date.now()}`,
        sessionId: session.id,
        role: "user",
        content: text,
        translation: null,
        correction: null,
        feedback: null,
        verdict: null,
        correctAnswer: null,
        targetVerb: null,
        targetPerson: null,
        vocabHints: null,
        createdAt: new Date().toISOString(),
      },
    ]);

    const res = await fetch("/api/verb-practice/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id, message: text }),
    });
    const data = await res.json();
    setSending(false);

    if (!res.ok) {
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("tmp-")));
      setInput(text);
      setError(data.error ?? "Something went wrong");
      return;
    }
    setMessages((prev) => [
      ...prev.filter((m) => !m.id.startsWith("tmp-")),
      data.userMessage,
      data.assistantMessage,
    ]);
  };

  if (sessionLoading) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Verb Practice</h1>
        <Card className="space-y-4">
          <p className="text-sm text-muted">
            Focus practice on conjugating specific verbs across different persons and tenses.
          </p>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted">Which verbs?</p>
            <VerbPicker selected={selectedVerbs} onToggle={toggleVerb} />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted">How do you want to practice?</p>
            <ModeToggle mode={mode} onChange={setMode} />
          </div>
          <Button
            onClick={startSession}
            disabled={starting || selectedVerbs.length === 0}
            className="w-full"
          >
            {starting ? "Setting up…" : "Start practice"}
          </Button>
          {error && <p className="text-sm text-danger">{error}</p>}
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-2">
        <h1 className="text-lg font-bold">Verb Practice</h1>
        <div className="mt-1.5 flex items-center gap-1.5">
          <Button
            variant="secondary"
            onClick={() => {
              setSelectedVerbs(session.verbs.filter((v): v is VerbKey =>
                VERB_OPTIONS.some((o) => o.key === v)
              ));
              setMode(session.mode);
              setConfirmNewSession(true);
            }}
            className="!px-3 !py-1.5 text-xs"
          >
            🔄 New session
          </Button>
          <Button
            variant="secondary"
            onClick={() => setHideVerbs((h) => !h)}
            className="!px-3 !py-1.5 text-xs"
          >
            {hideVerbs ? "👁️ Show verbs" : "🙈 Hide verbs"}
          </Button>
        </div>
      </div>

      {confirmNewSession && (
        <Card className="mb-2 space-y-3">
          <div>
            <p className="text-sm font-medium">Start a new session?</p>
            <p className="text-xs text-muted">
              Clears the visible conversation (your old chat stays saved, just hidden).
            </p>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted">Which verbs?</p>
            <VerbPicker selected={selectedVerbs} onToggle={toggleVerb} />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted">How do you want to practice?</p>
            <ModeToggle mode={mode} onChange={setMode} />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={startSession}
              disabled={starting || selectedVerbs.length === 0}
              className="flex-1"
            >
              {starting ? "Starting…" : "Start new session"}
            </Button>
            <Button variant="secondary" onClick={() => setConfirmNewSession(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <div className="mb-2 flex flex-wrap gap-1.5">
        {hideVerbs ? (
          <span className="rounded-full bg-border/60 px-2 py-1 text-xs font-medium text-muted">
            Verbs hidden
          </span>
        ) : (
          session.verbs.map((v) => {
            const opt = VERB_OPTIONS.find((o) => o.key === v);
            return (
              <span
                key={v}
                className="rounded-full bg-border/60 px-2 py-1 text-xs font-medium text-foreground"
              >
                {opt?.label ?? v}
              </span>
            );
          })
        )}
        <span className="rounded-full bg-accent/15 px-2 py-1 text-xs font-medium text-accent">
          {session.mode === "drill" ? "Drill mode" : "Conversation mode"}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pb-2">
        {messages.length === 0 && (
          <Card className="text-center text-sm text-muted">
            {session.mode === "drill"
              ? "Getting your first prompt ready…"
              : "Say hello to get the conversation started."}
          </Card>
        )}
        {messages.map((m) => (
          <VerbChatBubble key={m.id} message={m} mode={session.mode} />
        ))}
        {sending && (
          <div className="mr-auto max-w-[85%] rounded-2xl border border-border bg-card px-3.5 py-2.5 text-sm text-muted">
            …
          </div>
        )}
        {error && <p className="text-xs text-danger">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="mt-2 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            session.mode === "drill" ? "Type your answer in Darija…" : "Type in Darija or English…"
          }
          className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
        />
        <Button type="submit" disabled={sending || !input.trim()} className="!px-4">
          Send
        </Button>
      </form>
    </div>
  );
}
