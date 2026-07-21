"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card } from "@/components/ui";
import PhraseForm, { PhraseFormValues } from "./PhraseForm";
import PhraseListItem from "./PhraseListItem";
import type { Phrase } from "@/lib/types";

async function fetchPhrases(): Promise<Phrase[]> {
  const res = await fetch("/api/phrases");
  return res.json();
}

export default function PhrasesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <PhrasesPageInner />
    </Suspense>
  );
}

function PhrasesPageInner() {
  const searchParams = useSearchParams();
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(searchParams.get("add") === "1");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    fetchPhrases().then((data) => {
      setPhrases(data);
      setLoading(false);
    });
  }, []);

  const tags = useMemo(() => {
    const set = new Set<string>();
    phrases.forEach((p) => p.tag && set.add(p.tag));
    return Array.from(set).sort();
  }, [phrases]);

  const visible = useMemo(
    () => (activeTag ? phrases.filter((p) => p.tag === activeTag) : phrases),
    [phrases, activeTag]
  );

  const handleAdd = async (values: PhraseFormValues) => {
    const res = await fetch("/api/phrases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const created = await res.json();
    setPhrases((prev) => [created, ...prev]);
    setShowForm(false);
  };

  const handleUpdate = async (id: string, values: PhraseFormValues) => {
    const res = await fetch(`/api/phrases/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const updated = await res.json();
    setPhrases((prev) => prev.map((p) => (p.id === id ? updated : p)));
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/phrases/${id}`, { method: "DELETE" });
    setPhrases((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">My Phrases</h1>
        <Button onClick={() => setShowForm((s) => !s)} className="!px-3 !py-2 text-xs">
          {showForm ? "Close" : "+ Add phrase"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <PhraseForm onSubmit={handleAdd} />
        </Card>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveTag(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              activeTag === null ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted"
            }`}
          >
            All
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                activeTag === tag ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : visible.length === 0 ? (
        <Card className="text-center text-sm text-muted">
          {phrases.length === 0
            ? "No phrases yet — add your first one from Saturday's class!"
            : "No phrases with this tag."}
        </Card>
      ) : (
        <div className="space-y-2.5">
          {visible.map((phrase) => (
            <PhraseListItem
              key={phrase.id}
              phrase={phrase}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
