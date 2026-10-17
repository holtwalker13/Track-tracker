"use client";

import { useState } from "react";
import Link from "next/link";
import { formatActivityValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LeaderboardBoard } from "@/lib/queries/leaderboard-grid";
import { leaderboardProfileQuery } from "@/lib/leaderboard-link";

function formatRecordDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function RankingList({
  board,
  athleteHrefBase,
  rankScope = "school",
  loading,
  initialLimit,
  compact = false,
}: {
  board: LeaderboardBoard | null;
  athleteHrefBase?: string;
  rankScope?: "school" | "global";
  loading?: boolean;
  /** When set, show this many rows until the user expands. */
  initialLimit?: number;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  if (loading) {
    return (
      <div className="mt-1 space-y-0" aria-busy="true" aria-label="Loading rankings">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex min-h-[61px] animate-pulse items-center gap-3 border-b border-[#30373B] py-3"
          >
            <div className="h-4 w-5 rounded bg-card" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-card" />
              <div className="h-3 w-16 rounded bg-card/70" />
            </div>
            <div className="h-5 w-16 rounded bg-card" />
          </div>
        ))}
      </div>
    );
  }

  if (!board) {
    return (
      <p className="py-10 text-center text-sm text-muted">No ranked events for this group.</p>
    );
  }

  if (board.entries.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted">No results for these filters</p>
    );
  }

  const limit = initialLimit && initialLimit > 0 ? initialLimit : board.entries.length;
  const canCollapse = board.entries.length > limit;
  const visible =
    canCollapse && !expanded ? board.entries.slice(0, limit) : board.entries;
  const hiddenCount = board.entries.length - limit;

  return (
    <>
    <ol className="mt-1 list-none" aria-label={`${board.activity.name} rankings`}>
      {visible.map((e, index) => {
        const isFirst = index === 0;
        const value = formatActivityValue(
          e.value,
          board.activity.unit,
          board.activity.slug
        );
        const dateLabel = formatRecordDate(e.testingDate);
        const query = leaderboardProfileQuery(board.activity.slug, e.rank, rankScope);
        const href =
          athleteHrefBase && e.linkable !== false
            ? `${athleteHrefBase}/${e.studentId}?${query}`
            : undefined;

        const row = (
          <div
            className={cn(
              "flex items-center gap-2 border-b border-[#30373B] py-2.5 pr-1",
              compact ? "min-h-[52px] gap-1.5 px-1" : "min-h-[61px] gap-3"
            )}
          >
            <span
              className={cn(
                "w-5 shrink-0 tabular-nums",
                compact ? "text-xs" : "text-sm",
                isFirst ? "font-semibold text-accent" : "text-muted"
              )}
              aria-label={`Rank ${e.rank}`}
            >
              {e.rank}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block font-semibold leading-snug",
                  compact ? "text-xs" : "text-sm"
                )}
              >
                {e.displayName}
              </span>
              {dateLabel ? (
                <span className={cn("block text-muted", compact ? "text-[10px]" : "text-xs")}>
                  {dateLabel}
                </span>
              ) : null}
            </span>
            <span
              className={cn(
                "shrink-0 font-bold tabular-nums",
                compact ? "text-base" : "text-xl",
                isFirst ? "text-accent" : "text-foreground"
              )}
            >
              {value}
            </span>
          </div>
        );

        if (href) {
          return (
            <li key={`${e.studentId}-${e.rank}`}>
              <Link href={href} className="block rounded-lg hover:bg-foreground/[0.03]">
                {row}
              </Link>
            </li>
          );
        }
        return <li key={`${e.studentId}-${e.rank}`}>{row}</li>;
      })}
    </ol>
    {canCollapse ? (
      <div className="px-2 pt-1">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="min-h-10 w-full text-left text-sm font-medium text-accent"
        >
          {expanded
            ? "Show top 10"
            : `View all (${hiddenCount} more)`}
        </button>
      </div>
    ) : null}
    </>
  );
}
