"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import DuplicateGroupCard from "./DuplicateGroupCard";
import type { Phrase } from "@/lib/types";

export default function FindDuplicatesPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Phrase[][] | null>(null);

  useEffect(() => {
    fetch("/api/phrases/duplicates")
      .then((res) => res.json())
      .then((data) => setGroups(data.groups));
  }, []);

  const handleDelete = async (id: string) => {
    await fetch(`/api/phrases/${id}`, { method: "DELETE" });
    setGroups(
      (prev) =>
        prev
          ?.map((group) => group.filter((p) => p.id !== id))
          .filter((group) => group.length > 1) ?? null
    );
  };

  return (
    <div className="space-y-4">
      <button onClick={() => router.push("/phrases")} className="text-xs text-muted">
        ← My Phrases
      </button>
      <h1 className="text-xl font-bold">Find duplicates</h1>
      <p className="text-sm text-muted">
        Phrases that share the same Arabic script or the same Latin spelling (ignoring case),
        grouped together so you can clean them up.
      </p>

      {groups === null ? (
        <p className="text-sm text-muted">Scanning your library…</p>
      ) : groups.length === 0 ? (
        <Card className="space-y-1 text-center">
          <p className="text-2xl">✨</p>
          <p className="text-sm font-medium">No exact duplicates found — your library looks clean.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <DuplicateGroupCard key={group[0].id} group={group} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
