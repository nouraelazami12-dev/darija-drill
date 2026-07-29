"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import type { Phrase } from "@/lib/types";

function PhraseRow({
  phrase,
  onDelete,
}: {
  phrase: Phrase;
  onDelete: (id: string) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex items-start justify-between gap-2 border-b border-border py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p dir="rtl" lang="ar" className="text-base leading-snug">
          {phrase.darijaArabic}
        </p>
        <p className="text-sm font-medium text-accent">{phrase.darijaLatin}</p>
        <p className="text-sm text-muted">{phrase.english}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {phrase.tag && (
            <span className="inline-block rounded-full bg-border/60 px-2 py-0.5 text-[11px] font-medium text-foreground">
              {phrase.tag}
            </span>
          )}
          <span className="text-[11px] text-muted">
            added {new Date(phrase.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      <div className="shrink-0">
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
  );
}

export default function DuplicateGroupCard({
  group,
  onDelete,
}: {
  group: Phrase[];
  onDelete: (id: string) => Promise<void>;
}) {
  return (
    <Card>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
        {group.length} possible duplicates
      </p>
      {group.map((phrase) => (
        <PhraseRow key={phrase.id} phrase={phrase} onDelete={onDelete} />
      ))}
    </Card>
  );
}
