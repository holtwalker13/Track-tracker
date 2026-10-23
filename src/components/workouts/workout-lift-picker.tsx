"use client";

import { useMemo, useState } from "react";
import {
  LIFT_BODY_GROUPS,
  type LiftBodyGroup,
} from "@/lib/lift-groups";
import { cn } from "@/lib/utils";

export type WorkoutLiftDraft = {
  slug: string;
  name: string;
  bodyGroup: LiftBodyGroup;
  enabled: boolean;
  order: number | null;
  sets: number;
  reps: number;
};

export function WorkoutLiftPicker({
  lifts,
  onChange,
}: {
  lifts: WorkoutLiftDraft[];
  onChange: (next: WorkoutLiftDraft[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<LiftBodyGroup | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lifts.filter((l) => {
      if (group !== "all" && l.bodyGroup !== group) return false;
      if (q && !l.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [lifts, query, group]);

  function toggle(index: number, enabled: boolean) {
    const next = [...lifts];
    const row = { ...next[index]! };
    if (enabled) {
      const maxOrder = next.reduce((m, r) => Math.max(m, r.order ?? 0), 0);
      row.enabled = true;
      row.order = maxOrder + 1;
    } else {
      row.enabled = false;
      const removed = row.order;
      row.order = null;
      if (removed != null) {
        for (let i = 0; i < next.length; i++) {
          const o = next[i]!.order;
          if (o != null && o > removed) next[i] = { ...next[i]!, order: o - 1 };
        }
      }
    }
    next[index] = row;
    onChange(next);
  }

  function updateRow(index: number, patch: Partial<WorkoutLiftDraft>) {
    const next = [...lifts];
    next[index] = { ...next[index]!, ...patch };
    onChange(next);
  }

  const enabledCount = lifts.filter((l) => l.enabled).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search lifts…"
          className="min-w-[10rem] flex-1 rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
        />
        <select
          value={group}
          onChange={(e) => setGroup(e.target.value as LiftBodyGroup | "all")}
          className="rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All groups</option>
          {LIFT_BODY_GROUPS.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-muted">
        Select lifts in workout order — the number shows sequence ({enabledCount} selected).
      </p>
      <div className="grid max-h-[min(22rem,50vh)] gap-2 overflow-y-auto sm:grid-cols-2">
        {filtered.map((l) => {
          const index = lifts.findIndex((x) => x.slug === l.slug);
          if (index < 0) return null;
          return (
            <label
              key={l.slug}
              className={cn(
                "flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-sm sm:items-center sm:gap-3",
                l.enabled
                  ? "border-sky-400/40 bg-sky-500/10"
                  : "border-card-border bg-background/30"
              )}
            >
              <input
                type="checkbox"
                checked={l.enabled}
                onChange={(e) => toggle(index, e.target.checked)}
                className="mt-1 shrink-0 sm:mt-0"
              />
              {l.enabled && l.order != null ? (
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white sm:mt-0">
                  {l.order}
                </span>
              ) : (
                <span className="mt-0.5 h-6 w-6 shrink-0 sm:mt-0" aria-hidden />
              )}
              <span className="min-w-0 flex-1 break-words font-medium leading-snug">{l.name}</span>
              <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-muted">
                <input
                  type="number"
                  min={1}
                  max={20}
                  disabled={!l.enabled}
                  value={l.sets}
                  onChange={(e) => updateRow(index, { sets: Number(e.target.value) })}
                  className="w-12 rounded border border-card-border bg-background px-1 py-0.5 text-center"
                  aria-label={`Sets for ${l.name}`}
                />
                ×
                <input
                  type="number"
                  min={1}
                  max={50}
                  disabled={!l.enabled}
                  value={l.reps}
                  onChange={(e) => updateRow(index, { reps: Number(e.target.value) })}
                  className="w-12 rounded border border-card-border bg-background px-1 py-0.5 text-center"
                  aria-label={`Reps for ${l.name}`}
                />
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/** Lifts enabled in selection order for save payloads. */
export function orderedEnabledLifts(lifts: WorkoutLiftDraft[]) {
  return [...lifts]
    .filter((l) => l.enabled)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
