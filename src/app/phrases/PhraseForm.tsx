"use client";

import { useState } from "react";
import { Button, Input, Label, Textarea } from "@/components/ui";

export type PhraseFormValues = {
  darijaArabic: string;
  darijaLatin: string;
  english: string;
  notes: string;
  tag: string;
};

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
  onSubmit: (values: PhraseFormValues) => Promise<void>;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<PhraseFormValues>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);

  const update = (field: keyof PhraseFormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setValues((v) => ({ ...v, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.darijaArabic.trim() || !values.darijaLatin.trim() || !values.english.trim()) {
      return;
    }
    setSaving(true);
    try {
      await onSubmit(values);
      if (!initial) setValues(EMPTY);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label>Darija (Arabic script)</Label>
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
    </form>
  );
}
