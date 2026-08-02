"use client";

import { Card } from "@/components/ui";
import type { Phrase } from "@/lib/types";

export default function TargetPhrasePanel({
  targetPhrases,
  usedPhraseIds,
  modeledPhraseIds,
}: {
  targetPhrases: Phrase[];
  usedPhraseIds: string[];
  modeledPhraseIds: string[];
}) {
  if (targetPhrases.length === 0) return null;

  return (
    <Card className="mb-2 space-y-1.5 !p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        Practicing this session
      </p>
      <div className="flex flex-wrap gap-1.5">
        {targetPhrases.map((p) => {
          const used = usedPhraseIds.includes(p.id);
          const modeled = !used && modeledPhraseIds.includes(p.id);
          const icon = used ? "✅" : modeled ? "🗣️" : "⭕";
          return (
            <span
              key={p.id}
              title={`${p.darijaArabic ? p.darijaArabic + " / " : ""}${p.darijaLatin} — ${p.english}`}
              className={`rounded-full px-2 py-1 text-xs font-medium ${
                used
                  ? "bg-success/15 text-success"
                  : modeled
                    ? "bg-accent/15 text-accent"
                    : "bg-border/60 text-foreground"
              }`}
            >
              {icon} {p.darijaLatin}
            </span>
          );
        })}
      </div>
    </Card>
  );
}
