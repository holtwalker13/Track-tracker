"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { MEDAL_LABELS, MEDALS } from "@/lib/kpi-targets";
import { AGE_BRACKETS, type AgeBracketId } from "@/lib/age-brackets";
import { cn } from "@/lib/utils";
import type { SchoolLiftRow } from "@/lib/queries/lifts";

const LIFT_UNITS = [
  { id: "lb", label: "Pounds (lb)" },
  { id: "reps", label: "Reps / count" },
  { id: "x BW", label: "× Bodyweight (relative)" },
];

export function LiftBuilderModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (lift: SchoolLiftRow) => void;
}) {
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState("lb");
  const [direction, setDirection] = useState<"HIGHER_BETTER" | "LOWER_BETTER">("HIGHER_BETTER");
  const [brackets, setBrackets] = useState<AgeBracketId[]>(["high-9-12"]);
  const [genders, setGenders] = useState<Array<"F" | "M">>(["F", "M"]);
  const [targets, setTargets] = useState<
    Record<string, Record<string, Record<string, string>>>
  >({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDirection(unit === "seconds" ? "LOWER_BETTER" : "HIGHER_BETTER");
  }, [unit]);

  function toggleBracket(id: AgeBracketId) {
    setBrackets((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  }

  function toggleGender(g: "F" | "M") {
    setGenders((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  }

  function setMedalTarget(bracket: string, gender: string, medal: string, value: string) {
    setTargets((prev) => ({
      ...prev,
      [bracket]: {
        ...(prev[bracket] ?? {}),
        [gender]: {
          ...(prev[bracket]?.[gender] ?? {}),
          [medal]: value,
        },
      },
    }));
  }

  async function onSave() {
    setSaving(true);
    setError("");
    const numericTargets: Record<string, Record<string, Record<string, number>>> = {};
    for (const b of brackets) {
      numericTargets[b] = {};
      for (const g of genders) {
        numericTargets[b]![g] = {};
        for (const medal of MEDALS) {
          const raw = targets[b]?.[g]?.[medal];
          if (raw != null && raw !== "" && Number.isFinite(Number(raw))) {
            numericTargets[b]![g]![medal] = Number(raw);
          }
        }
      }
    }

    const res = await fetch("/api/lifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        title,
        unit,
        direction,
        ageBrackets: brackets,
        genders,
        targets: numericTargets,
      }),
    });
    setSaving(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not create lift");
      return;
    }
    onCreated({
      slug: data.activity.slug,
      name: data.activity.name,
      unit,
      custom: true,
      forWorkouts: unit === "lb" || unit === "reps",
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Build lift"
        className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-card-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-card-border px-4 py-3 sm:px-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300/80">
              Lift builder
            </p>
            <h2 className="text-lg font-semibold">New school lift</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-card-border text-muted"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          <p className="text-sm text-muted">
            Same idea as the KPI builder: name it, pick lb / reps / × BW, optionally set gold–silver–bronze
            targets. Custom lifts appear in programs, workout logs, and KPI targets.
          </p>
          <label className="block text-sm">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Trap bar deadlift"
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2.5"
            />
          </label>

          <label className="block text-sm">
            Unit
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2.5"
            >
              {LIFT_UNITS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend className="text-sm">Scoring</legend>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(
                [
                  { id: "HIGHER_BETTER" as const, label: "Higher is better" },
                  { id: "LOWER_BETTER" as const, label: "Lower is better" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDirection(opt.id)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm",
                    direction === opt.id
                      ? "border-sky-400/50 bg-sky-400/15 text-sky-200"
                      : "border-card-border text-muted"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm">Age bands (for optional targets)</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {AGE_BRACKETS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggleBracket(b.id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold",
                    brackets.includes(b.id)
                      ? "bg-sky-400/20 text-sky-300 ring-1 ring-sky-400/50"
                      : "border border-card-border text-muted"
                  )}
                >
                  {b.shortLabel}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm">Genders</legend>
            <div className="mt-2 flex gap-2">
              {(["F", "M"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGender(g)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold",
                    genders.includes(g)
                      ? "bg-sky-400/20 text-sky-300 ring-1 ring-sky-400/50"
                      : "border border-card-border text-muted"
                  )}
                >
                  {g === "F" ? "Girls" : "Boys"}
                </button>
              ))}
            </div>
          </fieldset>

          {brackets.length > 0 && genders.length > 0 && (
            <div className="space-y-3 rounded-xl border border-card-border bg-background/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Optional medal targets (also editable on KPI targets)
              </p>
              {brackets.map((b) => (
                <div key={b} className="space-y-2">
                  <p className="text-sm font-medium">
                    {AGE_BRACKETS.find((x) => x.id === b)?.label}
                  </p>
                  {genders.map((g) => (
                    <div key={g} className="grid grid-cols-4 gap-2 text-xs">
                      <span className="self-center text-muted">{g === "F" ? "Girls" : "Boys"}</span>
                      {MEDALS.map((medal) => (
                        <label key={medal} className="block">
                          <span
                            className={
                              medal === "gold"
                                ? "text-sport-gold"
                                : medal === "silver"
                                  ? "text-sport-silver"
                                  : "text-sport-bronze"
                            }
                          >
                            {MEDAL_LABELS[medal]}
                          </span>
                          <input
                            type="number"
                            step="any"
                            value={targets[b]?.[g]?.[medal] ?? ""}
                            onChange={(e) => setMedalTarget(b, g, medal, e.target.value)}
                            className="mt-1 w-full rounded-md border border-card-border bg-card px-2 py-1.5 font-mono"
                          />
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex gap-2 border-t border-card-border p-4 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-card-border py-2.5 text-sm font-medium text-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !title.trim() || brackets.length === 0}
            className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-background disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save lift"}
          </button>
        </div>
      </div>
    </div>
  );
}
