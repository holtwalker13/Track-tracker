"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { MEDAL_LABELS, MEDALS } from "@/lib/kpi-targets";
import { AGE_BRACKETS, type AgeBracketId } from "@/lib/age-brackets";
import { cn } from "@/lib/utils";
import type { SchoolLiftEditDetails, SchoolLiftRow } from "@/lib/queries/lifts";
import { LIFT_BODY_GROUPS, type LiftBodyGroup } from "@/lib/lift-groups";

const LIFT_UNITS = [
  { id: "lb", label: "Pounds (lb)" },
  { id: "reps", label: "Reps / count" },
  { id: "x BW", label: "× Bodyweight (relative)" },
];

export function LiftBuilderModal({
  onClose,
  onCreated,
  initialLift,
  onUpdated,
  onDeleted,
}: {
  onClose: () => void;
  onCreated?: (lift: SchoolLiftRow) => void;
  /** When set, modal edits an existing lift (full builder + delete). */
  initialLift?: SchoolLiftEditDetails | null;
  onUpdated?: (lift: SchoolLiftRow) => void;
  onDeleted?: (slug: string) => void;
}) {
  const isEdit = Boolean(initialLift?.slug);

  const [title, setTitle] = useState(initialLift?.name ?? "");
  const [unit, setUnit] = useState(initialLift?.unit ?? "lb");
  const [direction, setDirection] = useState<"HIGHER_BETTER" | "LOWER_BETTER">(
    initialLift?.direction ?? "HIGHER_BETTER"
  );
  const [brackets, setBrackets] = useState<AgeBracketId[]>(
    initialLift?.ageBrackets ?? ["high-9-12"]
  );
  const [genders, setGenders] = useState<Array<"F" | "M">>(initialLift?.genders ?? ["F", "M"]);
  const [bodyGroup, setBodyGroup] = useState<LiftBodyGroup>(initialLift?.bodyGroup ?? "other");
  const [targets, setTargets] = useState<
    Record<string, Record<string, Record<string, string>>>
  >(initialLift?.targets ?? {});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!initialLift) return;
    setTitle(initialLift.name);
    setUnit(initialLift.unit);
    setDirection(initialLift.direction);
    setBrackets(initialLift.ageBrackets);
    setGenders(initialLift.genders);
    setTargets(initialLift.targets);
    setBodyGroup(initialLift.bodyGroup);
    setError("");
  }, [initialLift]);

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

  function buildNumericTargets() {
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
    return numericTargets;
  }

  async function onSave() {
    setSaving(true);
    setError("");
    const numericTargets = buildNumericTargets();
    const payload = {
      title,
      unit,
      direction,
      ageBrackets: brackets,
      genders,
      targets: numericTargets,
      bodyGroup,
    };

    const res = await fetch("/api/lifts", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isEdit
          ? { slug: initialLift!.slug, ...payload }
          : { action: "create", ...payload }
      ),
    });
    setSaving(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? (isEdit ? "Could not update lift" : "Could not create lift"));
      return;
    }

    const row: SchoolLiftRow = {
      slug: isEdit ? initialLift!.slug : data.activity.slug,
      name: data.activity?.name ?? title.trim(),
      unit: data.activity?.unit ?? unit,
      custom: isEdit ? initialLift!.custom : true,
      forWorkouts:
        data.activity?.forWorkouts ?? (unit === "lb" || unit === "reps"),
      bodyGroup,
    };

    if (isEdit) onUpdated?.(row);
    else onCreated?.(row);
  }

  async function onDelete() {
    if (!initialLift) return;
    if (
      !window.confirm(
        `Remove "${initialLift.name}" from your school? Custom lifts are deleted. Built-in lifts are hidden (like KPIs).`
      )
    ) {
      return;
    }
    setDeleting(true);
    setError("");
    const res = await fetch("/api/lifts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: initialLift.slug }),
    });
    setDeleting(false);
    if (!res.ok) {
      setError("Could not remove lift.");
      return;
    }
    onDeleted?.(initialLift.slug);
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
        aria-label={isEdit ? "Edit lift" : "Build lift"}
        className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-card-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-card-border px-4 py-3 sm:px-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300/80">
              Lift builder
            </p>
            <h2 className="text-lg font-semibold">
              {isEdit ? "Edit school lift" : "New school lift"}
            </h2>
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
            <legend className="text-sm">Library group</legend>
            <p className="mt-0.5 text-xs text-muted">Where this lift appears in your grouped list.</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {LIFT_BODY_GROUPS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  disabled={isEdit && !initialLift?.custom}
                  onClick={() => setBodyGroup(g.id)}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-xs font-semibold",
                    bodyGroup === g.id
                      ? "border-sky-400/50 bg-sky-400/15 text-sky-200"
                      : "border-card-border text-muted",
                    isEdit && !initialLift?.custom && "cursor-not-allowed opacity-60"
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </fieldset>

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

        <div className="space-y-2 border-t border-card-border p-4 sm:px-5">
          {isEdit && (
            <button
              type="button"
              onClick={() => void onDelete()}
              disabled={deleting || saving}
              className="w-full rounded-lg border border-sport-red/40 py-2.5 text-sm font-medium text-sport-red disabled:opacity-50"
            >
              {deleting ? "Removing…" : "Remove from school"}
            </button>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-card-border py-2.5 text-sm font-medium text-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={saving || deleting || !title.trim() || brackets.length === 0}
              className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-background disabled:opacity-50"
            >
              {saving ? "Saving…" : isEdit ? "Save changes" : "Save lift"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
