"use client";

import { useState } from "react";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";

export type PhraseFormValues = {
  darijaArabic: string;
  darijaLatin: string;
  english: string;
  notes: string;
  tag: string;
};

export type DuplicateInfo = { darijaLatin: string; english: string };
export type SubmitResult = { duplicate?: DuplicateInfo } | void;

const EMPTY: PhraseFormValues = {
  darijaArabic: "",
  darijaLatin: "",
  english: "",
  notes: "",
  tag: "",
};

export default function PhraseForm({
  initial,
  submitLabel = "Add phrase",
  onSubmit,
  onCancel,
}: {
  initial?: PhraseFormValues;
  submitLabel?: string;
  onSubmit: (values: PhraseFormValues, force?: boolean) => Promise<SubmitResult>;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<PhraseFormValues>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const update = (field: keyof PhraseFormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setDuplicate(null);
    setValidationError(null);
    setValues((v) => ({ ...v, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    const missing: string[] = [];
    if (!values.darijaLatin.trim()) missing.push("Latin transliteration");
    if (!values.english.trim()) missing.push("English meaning");
    if (missing.length > 0) {
      setValidationError(`Please fill in: ${missing.join(", ")}.`);
      return;
    }
    setSaving(true);
    try {
      const result = await onSubmit(values);
      if (result?.duplicate) {
        setDuplicate(result.duplicate);
        return;
      }
      setDuplicate(null);
      if (!initial) setValues(EMPTY);
    } finally {
      setSaving(false);
    }
  };

  const addAnyway = async () => {
    setSaving(true);
    try {
      await onSubmit(values, true);
      setDuplicate(null);
      if (!initial) setValues(EMPTY);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label>Darija (Arabic script, optional)</Label>
        <Input
          dir="rtl"
          lang="ar"
          placeholder="بشحال هادا؟"
          value={values.darijaArabic}
          onChange={update("darijaArabic")}
        />
      </div>
      <div>
        <Label>Darija (Latin / Arabizi)</Label>
        <Input
          placeholder="bshhal hada?"
          value={values.darijaLatin}
          onChange={update("darijaLatin")}
        />
      </div>
      <div>
        <Label>English meaning</Label>
        <Input
          placeholder="How much is this?"
          value={values.english}
          onChange={update("english")}
        />
      </div>
      <div>
        <Label>Notes (optional)</Label>
        <Textarea
          rows={2}
          placeholder="Used when haggling at the market"
          value={values.notes}
          onChange={update("notes")}
        />
      </div>
      <div>
        <Label>Tag (optional)</Label>
        <Input
          placeholder="taxi, greetings, class 6..."
          value={values.tag}
          onChange={update("tag")}
        />
      </div>

      {validationError && <p className="text-sm text-danger">{validationError}</p>}

      {duplicate ? (
        <Card className="border-warning/50 bg-warning/10 space-y-2">
          <p className="text-sm">
            This looks like it might already be in your library:{" "}
            <span className="font-semibold">{duplicate.darijaLatin}</span> —{" "}
            {duplicate.english}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="warning" onClick={addAnyway} disabled={saving} className="flex-1">
              {saving ? "Adding…" : "Add anyway"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setDuplicate(null)}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? "Saving…" : submitLabel}
          </Button>
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      )}
    </form>
  );
}
