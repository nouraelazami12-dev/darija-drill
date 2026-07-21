"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import type { Scenario } from "@/lib/types";

export default function RoleplayPickerPage() {
  const [scenarios, setScenarios] = useState<Scenario[] | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/scenarios")
      .then((res) => res.json())
      .then(setScenarios);
  }, []);

  const addCustomScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    const created: Scenario = await res.json();
    setScenarios((prev) => [...(prev ?? []), created]);
    setName("");
    setDescription("");
    setShowCustomForm(false);
    setSaving(false);
    router.push(`/roleplay/${created.id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Roleplay Chat</h1>
        <Button
          onClick={() => setShowCustomForm((s) => !s)}
          className="!px-3 !py-2 text-xs"
        >
          {showCustomForm ? "Close" : "+ Custom"}
        </Button>
      </div>
      <p className="text-sm text-muted">Pick a scenario and practice a live conversation.</p>

      {showCustomForm && (
        <Card>
          <form onSubmit={addCustomScenario} className="space-y-3">
            <div>
              <Label>Scenario name</Label>
              <Input
                placeholder="Asking for directions"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label>Description (sets the scene for the LLM)</Label>
              <Textarea
                rows={2}
                placeholder="You're lost near the medina and stop a stranger to ask for directions to the train station."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Creating…" : "Create & start"}
            </Button>
          </form>
        </Card>
      )}

      {scenarios === null ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <div className="space-y-2.5">
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => router.push(`/roleplay/${scenario.id}`)}
              className="block w-full text-left"
            >
              <Card className="active:opacity-70">
                <p className="font-semibold">{scenario.name}</p>
                {scenario.description && (
                  <p className="mt-0.5 text-sm text-muted">{scenario.description}</p>
                )}
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
