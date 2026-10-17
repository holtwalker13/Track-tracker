"use client";

import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/compete/bottom-sheet";
import {
  LEADERBOARD_PERIODS,
  type LeaderboardPeriod,
} from "@/lib/leaderboard-periods";
import { GRADE_LEVELS, classYearShort } from "@/lib/grades";
import { reconcileDraftFilters, type DraftFilterSelection } from "@/lib/compete/query-state";
import { cn } from "@/lib/utils";

export function FiltersSheet({
  open,
  onClose,
  committed,
  onApply,
  lockedGender,
  showMoreOptions,
}: {
  open: boolean;
  onClose: () => void;
  committed: DraftFilterSelection;
  onApply: (next: DraftFilterSelection) => void;
  lockedGender?: "M" | "F";
  showMoreOptions?: boolean;
}) {
  const [draft, setDraft] = useState(committed);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(reconcileDraftFilters(committed, lockedGender));
      setMoreOpen(false);
    }
  }, [open, committed, lockedGender]);

  return (
    <BottomSheet
      open={open}
      title="Leaderboard filters"
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={() => onApply(reconcileDraftFilters(draft, lockedGender))}
          className="btn-primary w-full rounded-[10px] py-3 text-base font-bold"
        >
          Apply filters
        </button>
      }
    >
      <label className="mb-4 block">
        <span className="text-xs text-muted">Time period</span>
        <select
          value={draft.period}
          onChange={(e) =>
            setDraft((d) => ({ ...d, period: e.target.value as LeaderboardPeriod }))
          }
          className="mt-1.5 w-full rounded-[10px] border border-[#30373B] bg-background px-3 py-3 text-base"
        >
          {LEADERBOARD_PERIODS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      {lockedGender ? (
        <p className="mb-4 text-xs text-muted">
          Division locked to {lockedGender === "F" ? "Girls" : "Boys"}
        </p>
      ) : (
        <fieldset className="mb-4">
          <legend className="text-xs text-muted">Division</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(
              [
                { id: "F" as const, label: "Girls" },
                { id: "M" as const, label: "Boys" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={draft.gender === opt.id}
                onClick={() => setDraft((d) => ({ ...d, gender: opt.id }))}
                className={cn(
                  "rounded-[10px] px-3 py-3 text-sm font-medium",
                  draft.gender === opt.id
                    ? "bg-accent text-accent-foreground"
                    : "border border-[#30373B] text-muted"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <p className="mb-4 text-xs text-muted">
        Results · Best mark (each athlete&apos;s best eligible test in the window)
      </p>

      {showMoreOptions ? (
        <div className="border-t border-[#30373B] pt-4">
          <button
            type="button"
            className="text-sm font-medium text-muted"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((v) => !v)}
          >
            More options
          </button>
          {moreOpen ? (
            <div className="mt-4 space-y-4">
              <fieldset>
                <legend className="text-xs text-muted">Scope</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: "school" as const, label: "School" },
                      { id: "global" as const, label: "Global" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={draft.scope === opt.id}
                      onClick={() => setDraft((d) => ({ ...d, scope: opt.id }))}
                      className={cn(
                        "rounded-[10px] px-3 py-3 text-sm font-medium",
                        draft.scope === opt.id
                          ? "bg-accent text-accent-foreground"
                          : "border border-[#30373B] text-muted"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-xs text-muted">Graduation year</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-pressed={draft.grades.length === GRADE_LEVELS.length}
                    onClick={() => setDraft((d) => ({ ...d, grades: [...GRADE_LEVELS] }))}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm",
                      draft.grades.length === GRADE_LEVELS.length
                        ? "bg-accent/20 text-accent ring-1 ring-accent/50"
                        : "border border-[#30373B] text-muted"
                    )}
                  >
                    All
                  </button>
                  {GRADE_LEVELS.map((y) => {
                    const on =
                      draft.grades.includes(y) &&
                      draft.grades.length < GRADE_LEVELS.length;
                    return (
                      <button
                        key={y}
                        type="button"
                        aria-pressed={on}
                        onClick={() => {
                          setDraft((d) => {
                            let next: number[];
                            if (d.grades.length === GRADE_LEVELS.length) next = [y];
                            else if (d.grades.includes(y)) {
                              next = d.grades.filter((g) => g !== y);
                              if (next.length === 0) next = [...GRADE_LEVELS];
                            } else next = [...d.grades, y].sort((a, b) => a - b);
                            return { ...d, grades: next };
                          });
                        }}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-sm",
                          on
                            ? "bg-accent/20 text-accent ring-1 ring-accent/50"
                            : "border border-[#30373B] text-muted"
                        )}
                      >
                        {classYearShort(y)}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          ) : null}
        </div>
      ) : null}
    </BottomSheet>
  );
}
