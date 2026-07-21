"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Textarea } from "@/components/ui";
import ImportCandidateRow, { Candidate } from "./ImportCandidateRow";
import type { ExtractedPhrase } from "@/lib/types";

export default function ImportPhrasesPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  const extract = async () => {
    if (!text.trim()) return;
    setError(null);
    setExtracting(true);
    try {
      const res = await fetch("/api/phrases/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      const phrases = (data.phrases ?? []) as ExtractedPhrase[];
      if (phrases.length === 0) {
        setError("Didn't find any phrases in that text — try pasting more of the source.");
        return;
      }
      setCandidates(phrases.map((p) => ({ ...p, include: true })));
    } finally {
      setExtracting(false);
    }
  };

  const updateCandidate = (index: number) => (next: Candidate) => {
    setCandidates((prev) => prev!.map((c, i) => (i === index ? next : c)));
  };

  const includedCount = candidates?.filter((c) => c.include).length ?? 0;

  const save = async () => {
    if (!candidates) return;
    setError(null);
    setSaving(true);
    try {
      const toSave = candidates.filter((c) => c.include);
      const res = await fetch("/api/phrases/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrases: toSave }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      router.push("/phrases");
    } finally {
      setSaving(false);
    }
  };

  if (candidates) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setCandidates(null)} className="text-xs text-muted">
            ← Back
          </button>
          <span className="text-xs font-medium text-muted">
            {includedCount} of {candidates.length} selected
          </span>
        </div>
        <h1 className="text-xl font-bold">Review phrases</h1>
        <p className="text-sm text-muted">
          Uncheck anything you don&apos;t want, edit as needed, then save.
        </p>

        <div className="space-y-2.5">
          {candidates.map((c, i) => (
            <ImportCandidateRow key={i} candidate={c} onChange={updateCandidate(i)} />
          ))}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button
          onClick={save}
          disabled={saving || includedCount === 0}
          className="w-full !py-4 text-base"
        >
          {saving ? "Saving…" : `Save ${includedCount} phrase${includedCount === 1 ? "" : "s"}`}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={() => router.push("/phrases")} className="text-xs text-muted">
        ← My Phrases
      </button>
      <h1 className="text-xl font-bold">Import phrases</h1>
      <p className="text-sm text-muted">
        Paste your class slides or a Zoom transcript below, and I&apos;ll pull out the Darija
        phrases for you to review before adding them.
      </p>

      <Card className="space-y-3">
        <Textarea
          rows={10}
          placeholder="Paste slide text or a lesson transcript here…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            className="!py-2 text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload .txt / .vtt file
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.vtt,text/plain,text/vtt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </div>
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button
        onClick={extract}
        disabled={extracting || !text.trim()}
        className="w-full !py-4 text-base"
      >
        {extracting ? "Reading through it…" : "Extract phrases"}
      </Button>
    </div>
  );
}
