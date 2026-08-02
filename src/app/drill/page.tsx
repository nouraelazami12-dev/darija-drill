"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import type { Phrase } from "@/lib/types";

const COUNTDOWN_SECONDS = 5;

type Phase = "countdown" | "revealed";
type Grade = "got_it" | "close" | "missed";

function playAudio(url: string) {
  new Audio(url).play().catch(() => {});
}

export default function DrillPage() {
  const [queue, setQueue] = useState<Phrase[] | null>(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("countdown");
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [sessionDone, setSessionDone] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/drill/due")
      .then((res) => res.json())
      .then((data) => setQueue(data));
  }, []);

  const current = queue?.[index];

  useEffect(() => {
    if (!current || phase !== "countdown") return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          setPhase("revealed");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, phase === "countdown"]);

  const reveal = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("revealed");
  };

  const grade = async (g: Grade) => {
    if (!current) return;
    await fetch("/api/drill/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phraseId: current.id, grade: g }),
    });
    setSessionDone((n) => n + 1);
    if (queue && index + 1 < queue.length) {
      setIndex((i) => i + 1);
      setSecondsLeft(COUNTDOWN_SECONDS);
      setPhase("countdown");
    } else {
      setQueue([]);
    }
  };

  if (queue === null) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  if (queue.length === 0) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-bold">Speaking Drill</h1>
        <Card className="space-y-2 py-8">
          <p className="text-3xl">🎉</p>
          <p className="font-semibold">
            {sessionDone > 0 ? `Nice work — you drilled ${sessionDone} phrase${sessionDone === 1 ? "" : "s"}!` : "Nothing due right now."}
          </p>
          <p className="text-sm text-muted">
            {sessionDone > 0 ? "Come back later for more." : "Add some phrases or check back after your next review is due."}
          </p>
        </Card>
        <Link href="/phrases">
          <Button variant="secondary" className="w-full">
            Go to My Phrases
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Speaking Drill</h1>
        <span className="text-xs font-medium text-muted">
          {index + 1} / {queue.length}
        </span>
      </div>

      <Card className="space-y-4 py-8 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Say this in Darija
        </p>
        <p className="text-2xl font-semibold leading-snug">{current!.english}</p>

        {phase === "countdown" ? (
          <div className="space-y-3 pt-2">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-primary text-2xl font-bold text-primary">
              {secondsLeft}
            </div>
            <Button variant="secondary" onClick={reveal}>
              I&apos;m ready
            </Button>
          </div>
        ) : (
          <div className="space-y-2 border-t border-border pt-4">
            {current!.darijaArabic && (
              <p dir="rtl" lang="ar" className="text-2xl leading-snug">
                {current!.darijaArabic}
              </p>
            )}
            <p className="text-lg font-medium text-accent">{current!.darijaLatin}</p>
            {current!.audioUrl && (
              <button
                onClick={() => playAudio(current!.audioUrl!)}
                className="mx-auto mt-1 flex items-center gap-1 rounded-full bg-border/50 px-3 py-1.5 text-xs font-medium text-foreground"
              >
                🔊 Play audio
              </button>
            )}
            {current!.notes && (
              <p className="pt-1 text-xs italic text-muted">{current!.notes}</p>
            )}
          </div>
        )}
      </Card>

      {phase === "revealed" && (
        <div className="grid grid-cols-3 gap-2">
          <Button variant="danger" onClick={() => grade("missed")}>
            Missed it
          </Button>
          <Button variant="warning" onClick={() => grade("close")}>
            Close
          </Button>
          <Button variant="success" onClick={() => grade("got_it")}>
            Got it
          </Button>
        </div>
      )}
    </div>
  );
}
