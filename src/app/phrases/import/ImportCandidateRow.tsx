"use client";

import { Card, Input } from "@/components/ui";
import type { ExtractedPhrase } from "@/lib/types";

export type Candidate = ExtractedPhrase & { include: boolean };

export default function ImportCandidateRow({
  candidate,
  onChange,
}: {
  candidate: Candidate;
  onChange: (next: Candidate) => void;
}) {
  const update = (field: keyof Candidate) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...candidate, [field]: e.target.value });

  return (
    <Card className={candidate.include ? "" : "opacity-50"}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={candidate.include}
          onChange={(e) => onChange({ ...candidate, include: e.target.checked })}
          className="mt-1.5 h-4 w-4 shrink-0 accent-primary"
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          {candidate.isDuplicate && (
            <span className="inline-block rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning">
              Already in your library
            </span>
          )}
          <Input
            dir="rtl"
            lang="ar"
            value={candidate.darijaArabic ?? ""}
            onChange={update("darijaArabic")}
            disabled={!candidate.include}
          />
          <Input
            value={candidate.darijaLatin}
            onChange={update("darijaLatin")}
            disabled={!candidate.include}
          />
          <Input
            value={candidate.english}
            onChange={update("english")}
            disabled={!candidate.include}
          />
          <Input
            placeholder="tag (optional)"
            value={candidate.tag ?? ""}
            onChange={update("tag")}
            disabled={!candidate.include}
            className="text-xs"
          />
        </div>
      </div>
    </Card>
  );
}
