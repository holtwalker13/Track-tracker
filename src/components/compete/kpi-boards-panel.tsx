"use client";

import { useEffect, useState } from "react";
import { Columns2, Rows3 } from "lucide-react";
import { ActivityIcon } from "@/lib/activity-icons";
import type { LeaderboardBoard } from "@/lib/queries/leaderboard-grid";
import { RankingList } from "@/components/compete/ranking-list";
import { cn } from "@/lib/utils";

const LAYOUT_KEY = "compete-leaderboard-layout";

type LayoutMode = "single" | "double";

function readLayoutPreference(): LayoutMode {
  if (typeof window === "undefined") return "double";
  try {
    const v = localStorage.getItem(LAYOUT_KEY);
    return v === "single" ? "single" : "double";
  } catch {
    return "double";
  }
}

export function KpiBoardsPanel({
  boards,
  athleteHrefBase,
  rankScope,
  loading,
}: {
  boards: LeaderboardBoard[];
  athleteHrefBase?: string;
  rankScope?: "school" | "global";
  loading?: boolean;
}) {
  const [layout, setLayout] = useState<LayoutMode>("double");

  useEffect(() => {
    setLayout(readLayoutPreference());
  }, []);

  function setLayoutMode(mode: LayoutMode) {
    setLayout(mode);
    try {
      localStorage.setItem(LAYOUT_KEY, mode);
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return (
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-[#30373B] bg-[#1B2023]/40 p-3"
            aria-hidden
          >
            <div className="mb-3 h-5 w-2/3 rounded bg-card" />
            <div className="space-y-2">
              <div className="h-10 rounded bg-card/80" />
              <div className="h-10 rounded bg-card/80" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (boards.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted">No ranked KPIs for this group.</p>
    );
  }

  const double = layout === "double";

  return (
    <div className="mt-2">
      <div className="mb-3 flex items-center justify-end gap-1">
        <span className="mr-auto text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          Ranked KPIs
        </span>
        <div
          className="inline-flex rounded-lg border border-[#30373B] p-0.5"
          role="group"
          aria-label="Leaderboard layout"
        >
          <button
            type="button"
            onClick={() => setLayoutMode("single")}
            className={cn(
              "inline-flex min-h-9 min-w-9 items-center justify-center rounded-md px-2",
              !double ? "bg-accent/15 text-accent" : "text-muted"
            )}
            aria-pressed={!double}
            title="Single column"
          >
            <Rows3 className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode("double")}
            className={cn(
              "inline-flex min-h-9 min-w-9 items-center justify-center rounded-md px-2",
              double ? "bg-accent/15 text-accent" : "text-muted"
            )}
            aria-pressed={double}
            title="Two columns"
          >
            <Columns2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-3 sm:gap-4",
          double ? "grid-cols-2" : "grid-cols-1"
        )}
      >
        {boards.map((board) => (
          <section
            key={board.activity.id}
            className="min-w-0 rounded-xl border border-[#30373B] bg-[#1B2023]/30"
            aria-labelledby={`kpi-heading-${board.activity.id}`}
          >
            <header className="flex items-start gap-2 border-b border-[#30373B] px-3 py-2.5">
              <ActivityIcon
                slug={board.activity.slug}
                categorySlug={board.activity.category?.slug}
                className="mt-0.5 h-4 w-4 shrink-0 text-accent"
              />
              <div className="min-w-0 flex-1">
                <h2
                  id={`kpi-heading-${board.activity.id}`}
                  className={cn(
                    "font-semibold leading-snug tracking-tight",
                    double ? "text-sm" : "text-base"
                  )}
                >
                  {board.activity.name}
                </h2>
                <p className="text-xs text-muted">
                  {board.entries.length === 0
                    ? "No results"
                    : `${board.entries.length} ranked`}
                </p>
              </div>
            </header>

            {board.entries.length > 0 ? (
              <>
                <div
                  className={cn(
                    "flex justify-between px-3 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted",
                    double && "px-2"
                  )}
                >
                  <span>Athlete</span>
                  <span>Best mark</span>
                </div>
                <div className={cn("px-1 pb-2", double && "px-0.5")}>
                  <RankingList
                    board={board}
                    athleteHrefBase={athleteHrefBase}
                    rankScope={rankScope}
                    initialLimit={10}
                    compact={double}
                  />
                </div>
              </>
            ) : (
              <p className="px-3 py-6 text-center text-xs text-muted">No results for these filters</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
