"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, GitCompare, X } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { ActivityIcon } from "@/lib/activity-icons";
import { formatActivityValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LeaderboardBoard } from "@/lib/queries/leaderboard-grid";

const MAX_COMPARE = 2;

export function LeaderboardGrid({
  boards,
  subtitle,
  athleteHrefBase,
  compareHref,
}: {
  boards: LeaderboardBoard[];
  subtitle?: string;
  /** Profile path prefix, e.g. `/coach/students` → `/coach/students/{id}`. */
  athleteHrefBase?: string;
  /** Base compare path, e.g. `/coach/compare` or `/student/compare`. */
  compareHref?: string;
}) {
  const router = useRouter();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const selectedNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const board of boards) {
      for (const e of board.entries) {
        if (!map.has(e.studentId)) map.set(e.studentId, e.displayName);
      }
    }
    return selected.map((id) => map.get(id) ?? "Athlete");
  }, [boards, selected]);

  function toggleSelect(studentId: string) {
    setSelected((prev) => {
      if (prev.includes(studentId)) return prev.filter((id) => id !== studentId);
      if (prev.length >= MAX_COMPARE) return [...prev.slice(1), studentId];
      return [...prev, studentId];
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected([]);
  }

  function goCompare() {
    if (!compareHref || selected.length < 2) return;
    const ids = selected.join(",");
    router.push(`${compareHref}?vs=athlete&ids=${encodeURIComponent(ids)}`);
  }

  return (
    <div className={cn(selectMode && "pb-28")}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        {subtitle ? <p className="max-w-2xl text-sm text-muted">{subtitle}</p> : <span />}
        {compareHref && (
          <button
            type="button"
            onClick={() => {
              if (selectMode) exitSelectMode();
              else setSelectMode(true);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold",
              selectMode
                ? "bg-sky-400/20 text-sky-300 ring-1 ring-sky-400/50"
                : "border border-card-border text-muted hover:text-foreground"
            )}
          >
            <GitCompare className="h-4 w-4" aria-hidden />
            {selectMode ? "Selecting…" : "Compare"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        {boards.map((board) => (
          <Card key={board.activity.id} className="p-3 sm:p-5">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <ActivityIcon
                slug={board.activity.slug}
                categorySlug={board.activity.category?.slug}
                className="h-5 w-5 shrink-0 sm:h-6 sm:w-6"
              />
              <CardTitle className="!text-xs !leading-tight sm:!text-base">
                {board.activity.name}
              </CardTitle>
            </div>
            {board.entries.length === 0 ? (
              <p className="mt-3 text-xs text-muted sm:text-sm">No results yet</p>
            ) : (
              <ol className="mt-2 max-h-80 space-y-0.5 overflow-y-auto sm:mt-3">
                {board.entries.map((e) => {
                  const isSelected = selected.includes(e.studentId);
                  const value = formatActivityValue(
                    e.value,
                    board.activity.unit,
                    board.activity.slug
                  );
                  const href =
                    !selectMode && athleteHrefBase && e.linkable !== false
                      ? `${athleteHrefBase}/${e.studentId}`
                      : undefined;

                  const row = (
                    <div
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-1 py-1 sm:gap-2 sm:px-2 sm:py-1.5",
                        e.displayName === "You" && "bg-foreground/8 ring-1 ring-foreground/15",
                        selectMode && isSelected && "bg-sky-400/10 ring-1 ring-sky-400/40"
                      )}
                    >
                      {selectMode ? (
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                            isSelected
                              ? "border-sky-400 bg-sky-500 text-white"
                              : "border-card-border bg-background"
                          )}
                          aria-hidden
                        >
                          {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                        </span>
                      ) : (
                        <span
                          className="w-7 shrink-0 text-right text-xs font-bold tabular-nums text-muted sm:w-8 sm:text-sm"
                          aria-label={`Rank ${e.rank}`}
                        >
                          {e.rank}
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate text-xs font-medium sm:text-sm">
                        {e.displayName}
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-mono text-[11px] font-semibold tabular-nums sm:text-sm">
                          {value}
                        </span>
                      </span>
                    </div>
                  );

                  if (selectMode) {
                    return (
                      <li key={`${board.activity.id}-${e.studentId}-${e.rank}`}>
                        <button
                          type="button"
                          onClick={() => toggleSelect(e.studentId)}
                          className="w-full text-left"
                          aria-pressed={isSelected}
                        >
                          {row}
                        </button>
                      </li>
                    );
                  }

                  if (href) {
                    return (
                      <li key={`${board.activity.id}-${e.studentId}-${e.rank}`}>
                        <Link href={href} className="block rounded-lg hover:bg-card-border/20">
                          {row}
                        </Link>
                      </li>
                    );
                  }

                  return (
                    <li key={`${board.activity.id}-${e.studentId}-${e.rank}`}>{row}</li>
                  );
                })}
              </ol>
            )}
            {board.entries.length > 0 && (
              <p className="mt-2 text-center text-[9px] uppercase tracking-wider text-muted sm:text-[10px]">
                {board.entries.length} ranked
              </p>
            )}
          </Card>
        ))}
      </div>

      {selectMode && (
        <div
          className="fixed inset-x-0 bottom-0 z-50 border-t border-card-border bg-background/95 px-4 py-3 backdrop-blur safe-bottom"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 text-sm">
              {selected.length === 0 && (
                <p className="text-muted">Tap two athletes to compare</p>
              )}
              {selected.length === 1 && (
                <p>
                  <span className="font-semibold">{selectedNames[0]}</span>
                  <span className="text-muted"> — pick one more</span>
                </p>
              )}
              {selected.length >= 2 && (
                <p className="truncate">
                  <span className="font-semibold">{selectedNames[0]}</span>
                  <span className="text-muted"> vs </span>
                  <span className="font-semibold">{selectedNames[1]}</span>
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={exitSelectMode}
                className="inline-flex items-center gap-1.5 rounded-lg border border-card-border px-4 py-2.5 text-sm font-medium text-muted"
              >
                <X className="h-4 w-4" aria-hidden />
                Cancel
              </button>
              <button
                type="button"
                onClick={goCompare}
                disabled={selected.length < 2}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
              >
                <GitCompare className="h-4 w-4" aria-hidden />
                Compare
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
