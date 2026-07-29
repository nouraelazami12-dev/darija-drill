"use client";

import { useState } from "react";
import { Button, Card, Textarea } from "@/components/ui";

type TranslationResult = {
  detectedLanguage: "english" | "darija";
  darijaArabic: string;
  darijaLatin: string;
  english: string;
  notes: string | null;
};

type SaveState = "idle" | "saving" | "saved" | "duplicate" | "error";

export default function TranslatePage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const translate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaveState("idle");
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  const saveToPhrases = async () => {
    if (!result) return;
    setSaveState("saving");
    try {
      const res = await fetch("/api/phrases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          darijaArabic: result.darijaArabic,
          darijaLatin: result.darijaLatin,
          english: result.english,
          tag: "translator",
        }),
      });
      if (res.status === 409) {
        setSaveState("duplicate");
        return;
      }
      if (!res.ok) {
        setSaveState("error");
        return;
      }
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Translate</h1>
        <p className="text-sm text-muted">
          Type a word or phrase in Darija (Arabic script or Latin) or in English.
        </p>
      </div>

      <form onSubmit={translate} className="space-y-2">
        <Textarea
          rows={2}
          placeholder="bshhal hadi? / بشحال هادي؟ / how much is this?"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit" disabled={loading || !text.trim()} className="w-full">
          {loading ? "Translating…" : "Translate"}
        </Button>
      </form>

      {error && <p className="text-sm text-danger">{error}</p>}

      {result && (
        <Card className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {result.detectedLanguage === "english" ? "English → Darija" : "Darija → English"}
          </p>
          <p dir="rtl" lang="ar" className="text-2xl leading-snug">
            {result.darijaArabic}
          </p>
          <p className="text-lg font-medium text-accent">{result.darijaLatin}</p>
          <p className="text-sm text-muted">{result.english}</p>
          {result.notes && <p className="text-xs italic text-muted">{result.notes}</p>}

          <div className="pt-1">
            {saveState === "saved" ? (
              <p className="text-xs font-medium text-success">✓ Saved to My Phrases</p>
            ) : saveState === "duplicate" ? (
              <p className="text-xs font-medium text-muted">Already in My Phrases</p>
            ) : (
              <Button
                variant="secondary"
                onClick={saveToPhrases}
                disabled={saveState === "saving"}
                className="!px-3 !py-2 text-xs"
              >
                {saveState === "saving" ? "Saving…" : "+ Save to My Phrases"}
              </Button>
            )}
            {saveState === "error" && (
              <p className="mt-1 text-xs text-danger">Couldn&apos;t save — try again.</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
