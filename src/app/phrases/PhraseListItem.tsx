"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import PhraseForm, { PhraseFormValues, SubmitResult } from "./PhraseForm";
import AudioRecorder from "./AudioRecorder";
import type { Phrase } from "@/lib/types";

export default function PhraseListItem({
  phrase,
  onUpdate,
  onDelete,
}: {
  phrase: Phrase;
  onUpdate: (id: string, values: PhraseFormValues, force?: boolean) => Promise<SubmitResult>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [audioUrl, setAudioUrl] = useState(phrase.audioUrl);

  if (editing) {
    return (
      <Card>
        <PhraseForm
          initial={{
            darijaArabic: phrase.darijaArabic ?? "",
            darijaLatin: phrase.darijaLatin,
            english: phrase.english,
            notes: phrase.notes ?? "",
            tag: phrase.tag ?? "",
          }}
          submitLabel="Save changes"
          onSubmit={async (values, force) => {
            const result = await onUpdate(phrase.id, values, force);
            if (!result?.duplicate && !result?.error) {
              setEditing(false);
            }
            return result;
          }}
          onCancel={() => setEditing(false)}
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {phrase.darijaArabic && (
            <p dir="rtl" lang="ar" className="text-lg leading-snug">
              {phrase.darijaArabic}
            </p>
          )}
          <p className="text-sm font-medium text-accent">{phrase.darijaLatin}</p>
          <p className="mt-1 text-sm text-muted">{phrase.english}</p>
          {phrase.notes && <p className="mt-1 text-xs text-muted italic">{phrase.notes}</p>}
          {phrase.tag && (
            <span className="mt-2 inline-block rounded-full bg-border/60 px-2 py-0.5 text-[11px] font-medium text-foreground">
              {phrase.tag}
            </span>
          )}
          <div className="mt-2.5">
            <AudioRecorder phraseId={phrase.id} audioUrl={audioUrl} onChange={setAudioUrl} />
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg px-2 py-1 text-xs font-medium text-muted active:text-foreground"
          >
            Edit
          </button>
          {confirmDelete ? (
            <div className="flex gap-1">
              <button
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  await onDelete(phrase.id);
                }}
                className="rounded-lg bg-danger px-2 py-1 text-xs font-medium text-white"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg px-2 py-1 text-xs text-muted"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded-lg px-2 py-1 text-xs font-medium text-danger active:opacity-70"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
