"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, GitCompare, Trophy, X } from "lucide-react";
import { ActivityIcon } from "@/lib/activity-icons";
import { formatActivityValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LeaderboardBoard } from "@/lib/queries/leaderboard-grid";
import { leaderboardProfileQuery } from "@/lib/leaderboard-link";
import {
  DISPLAY_GROUP_LABELS,
  DISPLAY_GROUP_ORDER,
  type ActivityDisplayGroup,
} from "@/lib/activity-groups";

const MAX_COMPARE = 2;

function formatRecordDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function LeaderboardGridInner({
  boards,
  subtitle,
  athleteHrefBase,
  selfHref,
  rankScope = "school",
  compareHref,
}: {
  boards: LeaderboardBoard[];
  subtitle?: string;
  athleteHrefBase?: string;
  selfHref?: string;
  rankScope?: "school" | "global";
  compareHref?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const eventParam = searchParams.get("event")?.trim() || "";
  const selectedBoard =
    boards.find((b) => b.activity.slug === eventParam) ?? boards[0] ?? null;

  const groupedSidebar = useMemo(() => {
    const map = new Map<ActivityDisplayGroup, LeaderboardBoard[]>();
    for (const g of DISPLAY_GROUP_ORDER) map.set(g, []);
    for (const board of boards) {
      const list = map.get(board.group) ?? [];
      list.push(board);
      map.set(board.group, list);
    }
    return DISPLAY_GROUP_ORDER.map((g) => ({
      group: g,
      label: DISPLAY_GROUP_LABELS[g],
      boards: map.get(g) ?? [],
    })).filter((g) => g.boards.length > 0);
  }, [boards]);

  const recentRecords = useMemo(() => {
    if (!selectedBoard) return [];
    return selectedBoard.entries.slice(0, 3);
  }, [selectedBoard]);

  const crossEventRecords = useMemo(() => {
    return boards
      .flatMap((board) => {
        const top = board.entries[0];
        if (!top) return [];
        return [{ board, entry: top }];
      })
      .sort((a, b) => {
        const at = a.entry.testingDate ? Date.parse(a.entry.testingDate) : 0;
        const bt = b.entry.testingDate ? Date.parse(b.entry.testingDate) : 0;
        return bt - at;
      })
      .slice(0, 6);
  }, [boards]);

  const selectedNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const board of boards) {
      for (const e of board.entries) {
        if (!map.has(e.studentId)) map.set(e.studentId, e.displayName);
      }
    }
    return selected.map((id) => map.get(id) ?? "Athlete");
  }, [boards, selected]);

  function setEvent(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) params.set("event", slug);
    else params.delete("event");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

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

  function entryHref(
    board: LeaderboardBoard,
    e: LeaderboardBoard["entries"][number]
  ) {
    if (selectMode) return undefined;
    const query = leaderboardProfileQuery(board.activity.slug, e.rank, rankScope);
    if (athleteHrefBase && e.linkable !== false) {
      return `${athleteHrefBase}/${e.studentId}?${query}`;
    }
    if (selfHref && e.displayName === "You") {
      return `${selfHref}?${query}`;
    }
    return undefined;
  }

  if (!selectedBoard) {
    return <p className="text-sm text-muted">No leaderboard events yet.</p>;
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

      {/* Mobile event picker */}
      <div className="mb-4 md:hidden">
        <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Event
          <select
            value={selectedBoard.activity.slug}
            onChange={(e) => setEvent(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-card-border bg-card px-3 py-2.5 text-sm font-medium text-foreground"
          >
            {boards.map((b) => (
              <option key={b.activity.id} value={b.activity.slug}>
                {b.activity.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex gap-5 lg:gap-6">
        <aside className="hidden w-56 shrink-0 md:block lg:w-64">
          <div className="sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-card-border bg-card/40 p-2">
            <p className="px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
              Events
            </p>
            <nav className="space-y-3" aria-label="Leaderboard events">
              {groupedSidebar.map(({ group, label, boards: groupBoards }) => (
                <div key={group}>
                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted/80">
                    {label}
                  </p>
                  <ul className="space-y-0.5">
                    {groupBoards.map((board) => {
                      const active = board.activity.slug === selectedBoard.activity.slug;
                      return (
                        <li key={board.activity.id}>
                          <button
                            type="button"
                            onClick={() => setEvent(board.activity.slug)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition",
                              active
                                ? "bg-sky-500/15 text-sky-100 ring-1 ring-sky-400/40"
                                : "text-muted hover:bg-foreground/[0.04] hover:text-foreground"
                            )}
                          >
                            <ActivityIcon
                              slug={board.activity.slug}
                              categorySlug={board.activity.category?.slug}
                              className="h-4 w-4 shrink-0"
                            />
                            <span className="min-w-0 flex-1 truncate font-medium">
                              {board.activity.name}
                            </span>
                            <span className="shrink-0 tabular-nums text-[11px] text-muted">
                              {board.entries.length}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ActivityIcon
                  slug={selectedBoard.activity.slug}
                  categorySlug={selectedBoard.activity.category?.slug}
                  className="h-6 w-6 shrink-0"
                />
                <h2 className="truncate text-xl font-semibold tracking-tight">
                  {selectedBoard.activity.name}
                </h2>
              </div>
              <p className="mt-1 text-sm text-muted">
                {selectedBoard.entries.length === 0
                  ? "No results in this window"
                  : `${selectedBoard.entries.length} ranked`}
              </p>
            </div>
          </div>

          {recentRecords.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5 text-sky-300" aria-hidden />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Top marks
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {recentRecords.map((e, i) => {
                  const href = entryHref(selectedBoard, e);
                  const value = formatActivityValue(
                    e.value,
                    selectedBoard.activity.unit,
                    selectedBoard.activity.slug
                  );
                  const dateLabel = formatRecordDate(e.testingDate);
                  const medal =
                    i === 0
                      ? "from-sky-500/25 to-card ring-sky-400/40"
                      : i === 1
                        ? "from-foreground/[0.06] to-card ring-card-border"
                        : "from-foreground/[0.03] to-card ring-card-border";
                  const body = (
                    <div
                      className={cn(
                        "rounded-2xl border bg-gradient-to-b p-4 ring-1",
                        medal
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                          #{e.rank}
                        </span>
                        {dateLabel && (
                          <span className="text-[11px] text-muted">{dateLabel}</span>
                        )}
                      </div>
                      <p className="mt-2 truncate text-sm font-semibold">{e.displayName}</p>
                      <p className="mt-1 font-mono text-2xl font-bold tabular-nums tracking-tight text-sky-100">
                        {value}
                      </p>
                    </div>
                  );
                  if (href) {
                    return (
                      <Link
                        key={`${e.studentId}-${e.rank}`}
                        href={href}
                        className="block transition hover:brightness-110"
                      >
                        {body}
                      </Link>
                    );
                  }
                  return <div key={`${e.studentId}-${e.rank}`}>{body}</div>;
                })}
              </div>
            </section>
          )}

          {!eventParam && crossEventRecords.length > 0 && (
            <section>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Recent records across events
              </p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {crossEventRecords.map(({ board, entry }) => {
                  const href = entryHref(board, entry);
                  const value = formatActivityValue(
                    entry.value,
                    board.activity.unit,
                    board.activity.slug
                  );
                  const dateLabel = formatRecordDate(entry.testingDate);
                  const card = (
                    <div className="flex items-center gap-3 rounded-xl border border-card-border bg-card/50 px-3 py-3">
                      <ActivityIcon
                        slug={board.activity.slug}
                        categorySlug={board.activity.category?.slug}
                        className="h-5 w-5 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-muted">{board.activity.name}</p>
                        <p className="truncate text-sm font-semibold">{entry.displayName}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-sm font-bold tabular-nums">{value}</p>
                        {dateLabel && (
                          <p className="text-[10px] text-muted">{dateLabel}</p>
                        )}
                      </div>
                    </div>
                  );
                  return (
                    <button
                      key={board.activity.id}
                      type="button"
                      className="w-full text-left transition hover:brightness-110"
                      onClick={() => setEvent(board.activity.slug)}
                    >
                      {card}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-card-border bg-card/30 p-2 sm:p-3">
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Full rankings
            </p>
            {selectedBoard.entries.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted">No results yet</p>
            ) : (
              <ol className="space-y-0.5">
                {selectedBoard.entries.map((e, i) => {
                  const isSelected = selected.includes(e.studentId);
                  const striped =
                    i % 2 === 1 && e.displayName !== "You" && !(selectMode && isSelected);
                  const value = formatActivityValue(
                    e.value,
                    selectedBoard.activity.unit,
                    selectedBoard.activity.slug
                  );
                  const href = entryHref(selectedBoard, e);
                  const dateLabel = formatRecordDate(e.testingDate);

                  const row = (
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-2 py-2 sm:gap-3 sm:px-3",
                        striped && "bg-foreground/[0.045]",
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
                          className="w-8 shrink-0 text-right text-sm font-bold tabular-nums text-muted"
                          aria-label={`Rank ${e.rank}`}
                        >
                          {e.rank}
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {e.displayName}
                      </span>
                      {dateLabel && (
                        <span className="hidden shrink-0 text-xs text-muted sm:inline">
                          {dateLabel}
                        </span>
                      )}
                      <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                        {value}
                      </span>
                    </div>
                  );

                  if (selectMode) {
                    return (
                      <li key={`${e.studentId}-${e.rank}`}>
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
                      <li key={`${e.studentId}-${e.rank}`}>
                        <Link href={href} className="block rounded-xl hover:bg-card-border/20">
                          {row}
                        </Link>
                      </li>
                    );
                  }

                  return <li key={`${e.studentId}-${e.rank}`}>{row}</li>;
                })}
              </ol>
            )}
          </section>
        </div>
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

export function LeaderboardGrid(props: {
  boards: LeaderboardBoard[];
  subtitle?: string;
  athleteHrefBase?: string;
  selfHref?: string;
  rankScope?: "school" | "global";
  compareHref?: string;
}) {
  return (
    <Suspense
      fallback={<div className="h-64 animate-pulse rounded-2xl bg-card/40" aria-hidden />}
    >
      <LeaderboardGridInner {...props} />
    </Suspense>
  );
}
