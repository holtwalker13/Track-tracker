"use client";

import { Plus, Trash2 } from "lucide-react";
import type { SetPrescription } from "@/lib/workout-prescriptions";

export type AssignLiftDraft = {
  activitySlug: string;
  name: string;
  sets: SetPrescription[];
};

export function ProgramsSetBuilderGrid({
  lifts,
  bulkPercent,
  onBulkPercentChange,
  onApplyBulkPercent,
  onUpdateLift,
}: {
  lifts: AssignLiftDraft[];
  bulkPercent: string;
  onBulkPercentChange: (v: string) => void;
  onApplyBulkPercent: () => void;
  onUpdateLift: (liftIdx: number, sets: SetPrescription[]) => void;
}) {
  if (lifts.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-card-border px-4 py-8 text-center text-sm text-muted">
        Select a day program to preview sets and % of 1RM.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-card-border/60 bg-background/40 px-3 py-2">
        <label className="text-xs font-medium text-muted">
          Apply % 1RM to all sets
          <input
            type="number"
            min={1}
            max={120}
            placeholder="85"
            value={bulkPercent}
            onChange={(e) => onBulkPercentChange(e.target.value)}
            className="mt-1 block w-24 rounded-lg border border-card-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={onApplyBulkPercent}
          className="rounded-lg border border-card-border px-3 py-1.5 text-sm hover:border-sky-400/40"
        >
          Apply
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-card-border">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-card-border bg-card/80 text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2 font-semibold">Lift</th>
              <th className="px-2 py-2 font-semibold">Set</th>
              <th className="px-2 py-2 font-semibold">Reps</th>
              <th className="px-2 py-2 font-semibold">% 1RM</th>
              <th className="px-2 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lifts.map((lift, liftIdx) =>
              lift.sets.map((set, setIdx) => (
                <tr
                  key={`${lift.activitySlug}-${setIdx}`}
                  className="border-b border-card-border/50 hover:bg-card/30"
                >
                  <td className="px-3 py-2 font-medium">
                    {setIdx === 0 ? lift.name : ""}
                  </td>
                  <td className="px-2 py-2 text-muted">{setIdx + 1}</td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={set.reps}
                      onChange={(e) => {
                        const next = [...lift.sets];
                        next[setIdx] = { ...set, reps: Number(e.target.value) || 1 };
                        onUpdateLift(liftIdx, next);
                      }}
                      className="w-14 rounded border border-card-border bg-background px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={1}
                      max={120}
                      placeholder="—"
                      value={set.percentOf1Rm ?? ""}
                      onChange={(e) => {
                        const next = [...lift.sets];
                        const raw = e.target.value.trim();
                        next[setIdx] = {
                          ...set,
                          percentOf1Rm: raw === "" ? null : Number(raw),
                        };
                        onUpdateLift(liftIdx, next);
                      }}
                      className="w-16 rounded border border-card-border bg-background px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-2 py-2">
                    {setIdx === lift.sets.length - 1 ? (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          title="Add set"
                          onClick={() => {
                            const last = lift.sets[lift.sets.length - 1];
                            onUpdateLift(liftIdx, [
                              ...lift.sets,
                              {
                                reps: last?.reps ?? 5,
                                percentOf1Rm: last?.percentOf1Rm ?? null,
                              },
                            ]);
                          }}
                          className="rounded p-1 text-muted hover:text-foreground"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        {lift.sets.length > 1 ? (
                          <button
                            type="button"
                            title="Remove last set"
                            onClick={() => onUpdateLift(liftIdx, lift.sets.slice(0, -1))}
                            className="rounded p-1 text-muted hover:text-sport-red"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
