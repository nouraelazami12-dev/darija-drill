"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card } from "@/components/ui";

type Stats = {
  dueCount: number;
  totalCount: number;
  currentStreak: number;
  longestStreak: number;
  practicedToday: boolean;
};

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then(setStats);
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Learn Darija</h1>
        <p className="text-sm text-muted">Keep the momentum going between classes.</p>
      </div>

      <Card className="text-center">
        <p className="text-3xl font-bold text-primary">
          {stats ? stats.currentStreak : "–"} {stats && stats.currentStreak > 0 ? "🔥" : ""}
        </p>
        <p className="text-xs font-medium text-muted">day streak</p>
      </Card>

      <div className="space-y-2.5">
        <Link href="/roleplay" className="block">
          <Button className="w-full !py-4 text-base">💬 Roleplay Chat</Button>
        </Link>
        <Link href="/verbs" className="block">
          <Button variant="secondary" className="w-full !py-4 text-base">
            🔁 Verb Practice
          </Button>
        </Link>
      </div>

      <Card>
        <p className="mb-2 text-sm font-semibold">Just came from class?</p>
        <p className="mb-3 text-sm text-muted">
          Log new phrases while they&apos;re fresh.
        </p>
        <Link href="/phrases?add=1" className="block">
          <Button variant="success" className="w-full">
            + Log new phrases
          </Button>
        </Link>
      </Card>

      <div className="text-center">
        <Link href="/drill" className="text-xs font-medium text-muted underline">
          🎯 Speaking Drill (flashcards)
        </Link>
      </div>
    </div>
  );
}
