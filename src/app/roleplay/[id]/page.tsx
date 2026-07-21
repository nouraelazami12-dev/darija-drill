"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import type { ChatMessage, Scenario } from "@/lib/types";

export default function RoleplayChatPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const scenarioId = params.id;

  const [scenario, setScenario] = useState<Scenario | null>(null);
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

    fetch(`/api/chat?scenarioId=${scenarioId}`)
      .then((res) => res.json())
      .then(setMessages);
  }, [scenarioId, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, hint]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    setInput("");
    setSending(true);
    setHint(null);

    setMessages((prev) => [
      ...prev,
      {
        id: `tmp-${Date.now()}`,
        scenarioId,
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
      },
    ]);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioId, message: text }),
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
  };

  const getHint = async () => {
    setHintLoading(true);
    setError(null);
    const res = await fetch("/api/chat/hint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioId }),
    });
    const data = await res.json();
    setHintLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't get a hint");
      return;
    }
    setHint(data.hint);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <button onClick={() => router.push("/roleplay")} className="text-xs text-muted">
            ← Scenarios
          </button>
          <h1 className="text-lg font-bold">{scenario?.name ?? "Roleplay"}</h1>
        </div>
        <Button
          variant="secondary"
          onClick={getHint}
          disabled={hintLoading}
          className="!px-3 !py-2 text-xs"
        >
          {hintLoading ? "…" : "💡 Hint"}
        </Button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pb-2">
        {messages.length === 0 && (
          <Card className="text-center text-sm text-muted">
            Say hello to get the conversation started.
          </Card>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
              m.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "mr-auto bg-card border border-border"
            }`}
          >
            {m.content}
          </div>
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
