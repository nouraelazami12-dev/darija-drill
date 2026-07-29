"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import TargetPhrasePanel from "./TargetPhrasePanel";
import ChatBubble from "./ChatBubble";
import type { ChatMessage, RoleplaySession, Scenario } from "@/lib/types";

type ScriptFormat = "arabizi" | "arabic_script";

export default function RoleplayChatPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const scenarioId = params.id;

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [session, setSession] = useState<RoleplaySession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [scriptFormat, setScriptFormat] = useState<ScriptFormat>("arabizi");
  const [starting, setStarting] = useState(false);
  const [confirmNewSession, setConfirmNewSession] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/scenarios/${scenarioId}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then(setScenario)
      .catch(() => router.push("/roleplay"));

    fetch(`/api/roleplay/sessions?scenarioId=${scenarioId}`)
      .then((res) => res.json())
      .then((data) => {
        setSession(data);
        setSessionLoading(false);
      });
  }, [scenarioId, router]);

  useEffect(() => {
    if (!session) return;
    fetch(`/api/chat?sessionId=${session.id}`)
      .then((res) => res.json())
      .then(setMessages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, hint]);

  const startSession = async (format: ScriptFormat) => {
    setError(null);
    setStarting(true);
    try {
      const res = await fetch("/api/roleplay/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId, scriptFormat: format }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setMessages([]);
      setSession(data);
      setConfirmNewSession(false);
      setHint(null);
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
    setHint(null);

    setMessages((prev) => [
      ...prev,
      {
        id: `tmp-${Date.now()}`,
        scenarioId,
        sessionId: session.id,
        role: "user",
        content: text,
        translation: null,
        correction: null,
        createdAt: new Date().toISOString(),
      },
    ]);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id, message: text }),
    });
    const data = await res.json();
    setSending(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    setMessages((prev) => [
      ...prev.filter((m) => !m.id.startsWith("tmp-")),
      data.userMessage,
      data.assistantMessage,
    ]);
    setSession((prev) => (prev ? { ...prev, ...data.progress } : prev));
  };

  const getHint = async () => {
    if (!session) return;
    setHintLoading(true);
    setError(null);
    const res = await fetch("/api/chat/hint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id }),
    });
    const data = await res.json();
    setHintLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't get a hint");
      return;
    }
    setHint(data.hint);
  };

  if (sessionLoading) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.push("/roleplay")} className="text-xs text-muted">
          ← Scenarios
        </button>
        <h1 className="text-lg font-bold">{scenario?.name ?? "Roleplay"}</h1>
        <Card className="space-y-4">
          <p className="text-sm text-muted">
            I&apos;ll pick a few phrases you&apos;re already practicing in My Phrases and help
            you work them naturally into this conversation.
          </p>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted">
              What format should the other character&apos;s replies use?
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setScriptFormat("arabizi")}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  scriptFormat === "arabizi"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted"
                }`}
              >
                Arabizi (Latin)
              </button>
              <button
                onClick={() => setScriptFormat("arabic_script")}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  scriptFormat === "arabic_script"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted"
                }`}
              >
                Arabic script
              </button>
            </div>
          </div>
          <Button onClick={() => startSession(scriptFormat)} disabled={starting} className="w-full">
            {starting ? "Setting up…" : "Start session"}
          </Button>
          {error && <p className="text-sm text-danger">{error}</p>}
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-2">
        <button onClick={() => router.push("/roleplay")} className="text-xs text-muted">
          ← Scenarios
        </button>
        <h1 className="text-lg font-bold">{scenario?.name ?? "Roleplay"}</h1>
        <div className="mt-1.5 flex items-center gap-1.5">
          <Button
            variant="secondary"
            onClick={getHint}
            disabled={hintLoading}
            className="!px-3 !py-1.5 text-xs"
          >
            {hintLoading ? "…" : "💡 Hint"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setScriptFormat(session.scriptFormat as ScriptFormat);
              setConfirmNewSession(true);
            }}
            className="!px-3 !py-1.5 text-xs"
          >
            🔄 New session
          </Button>
        </div>
      </div>

      {confirmNewSession && (
        <Card className="mb-2 space-y-3">
          <div>
            <p className="text-sm font-medium">Start a new session?</p>
            <p className="text-xs text-muted">
              Picks a fresh set of target phrases and clears the visible conversation (your old
              chat stays saved, just hidden).
            </p>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted">
              Script format for the other character&apos;s replies
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setScriptFormat("arabizi")}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  scriptFormat === "arabizi"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted"
                }`}
              >
                Arabizi (Latin)
              </button>
              <button
                onClick={() => setScriptFormat("arabic_script")}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  scriptFormat === "arabic_script"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted"
                }`}
              >
                Arabic script
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => startSession(scriptFormat)} disabled={starting} className="flex-1">
              {starting ? "Starting…" : "Start new session"}
            </Button>
            <Button variant="secondary" onClick={() => setConfirmNewSession(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <TargetPhrasePanel
        targetPhrases={session.targetPhrases}
        usedPhraseIds={session.usedPhraseIds}
        modeledPhraseIds={session.modeledPhraseIds}
      />

      <div className="flex-1 space-y-3 overflow-y-auto pb-2">
        {messages.length === 0 && (
          <Card className="text-center text-sm text-muted">
            Say hello to get the conversation started.
          </Card>
        )}
        {messages.map((m) => (
          <ChatBubble key={m.id} message={m} />
        ))}
        {sending && (
          <div className="mr-auto max-w-[85%] rounded-2xl border border-border bg-card px-3.5 py-2.5 text-sm text-muted">
            …
          </div>
        )}
        {hint && (
          <Card className="border-accent/60 bg-accent/10 text-sm whitespace-pre-wrap">
            <p className="mb-1 text-xs font-semibold text-accent">Hint</p>
            {hint}
          </Card>
        )}
        {error && <p className="text-xs text-danger">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="mt-2 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type in Darija or English…"
          className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
        />
        <Button type="submit" disabled={sending || !input.trim()} className="!px-4">
          Send
        </Button>
      </form>
    </div>
  );
}
