"use client";

import { useRef, useState } from "react";

function pickMimeType(): string {
  const candidates = ["audio/webm", "audio/mp4", "audio/ogg"];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

export default function AudioRecorder({
  phraseId,
  audioUrl,
  onChange,
}: {
  phraseId: string;
  audioUrl: string | null;
  onChange: (audioUrl: string | null) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upload = async (blob: Blob) => {
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "audio");
      const res = await fetch(`/api/phrases/${phraseId}/audio`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      onChange(data.audioUrl);
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        upload(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Couldn't access the microphone — check your browser permissions.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const removeAudio = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/phrases/${phraseId}/audio`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't remove audio");
        return;
      }
      onChange(null);
    } finally {
      setBusy(false);
    }
  };

  if (audioUrl) {
    return (
      <div className="flex items-center gap-2">
        <audio controls src={audioUrl} className="h-8 max-w-[180px]" />
        <button
          onClick={removeAudio}
          disabled={busy}
          className="text-xs font-medium text-danger"
        >
          Remove
        </button>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {recording ? (
        <button
          onClick={stopRecording}
          className="rounded-full bg-danger px-3 py-1 text-xs font-medium text-white"
        >
          ⏹ Stop recording
        </button>
      ) : (
        <button
          onClick={startRecording}
          disabled={busy}
          className="rounded-full bg-border/60 px-3 py-1 text-xs font-medium text-foreground"
        >
          🎙️ Record audio
        </button>
      )}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={busy || recording}
        className="rounded-full bg-border/60 px-3 py-1 text-xs font-medium text-foreground"
      >
        ⬆️ Upload audio
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
      {busy && <span className="text-xs text-muted">Saving…</span>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
