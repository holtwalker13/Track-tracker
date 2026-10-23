"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Menu } from "lucide-react";
import { formatActivityValue } from "@/lib/format";
import { filterSummaryShort, parseLeaderboardSearchParams } from "@/lib/compete/query-state";
import type { LeaderboardBoard } from "@/lib/queries/leaderboard-grid";
import type { AthleteLineupView } from "@/lib/queries/compare";
import { AthleteLineup } from "@/components/compare/athlete-lineup";
import { cn } from "@/lib/utils";
import { LeaderboardEntryName } from "@/components/leaderboards/leaderboard-entry-name";
import { isHiddenStudentLeaderboardLabel } from "@/lib/leaderboard-privacy";
import { restoreCompeteLeaderboardScroll } from "@/components/compete/compete-leaderboard";
import { useCompeteMenu } from "@/components/compete/compete-ui-provider";

function CompareInner({
  boards,
  lineup,
  defaultCoachId,
  defaultClassId,
  defaultSubgroupId,
  leaderboardHref,
}: {
  boards: LeaderboardBoard[];
  lineup: AthleteLineupView | null;
  defaultCoachId: string;
  defaultClassId: string;
  defaultSubgroupId: string | null;
  leaderboardHref: string;
}) {
  const { openMenu } = useCompeteMenu();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const committed = useMemo(
    () =>
      parseLeaderboardSearchParams(searchParams, {
        coachId: defaultCoachId,
        classId: defaultClassId,
        subgroupId: defaultSubgroupId,
        eventSlug: boards[0]?.activity.slug,
      }),
    [searchParams, defaultCoachId, defaultClassId, defaultSubgroupId, boards]
  );

  const board =
    boards.find((b) => b.activity.slug === committed.eventSlug) ?? boards[0] ?? null;

  const [selected, setSelected] = useState<string[]>(() => {
    const fromUrl = searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
    return fromUrl.slice(0, 2);
  });
  const [showResults, setShowResults] = useState(
    () => (searchParams.get("ids")?.split(",").filter(Boolean).length ?? 0) >= 2
  );

  useEffect(() => {
    const fromUrl =
      searchParams.get("ids")?.split(",").map((id) => id.trim()).filter(Boolean).slice(0, 2) ??
      [];
    setSelected(fromUrl);
    setShowResults(fromUrl.length >= 2 && Boolean(lineup));
  }, [searchParams, lineup]);

  const roster = board?.entries ?? [];
  const filterLine = filterSummaryShort(committed);

  function toggle(id: string) {
    setShowResults(false);
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  }

  const compareReady = selected.length === 2;

  function runCompare() {
    if (!compareReady) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("ids", selected.join(","));
    router.push(`${pathname}?${params.toString()}`);
    setShowResults(true);
  }

  return (
    <div>
      <header className="sticky top-0 z-30 -mx-4 flex items-center justify-between border-b border-[#30373B] bg-background px-4 py-2.5 md:hidden">
        <span className="text-xs font-bold uppercase tracking-[0.08em] text-accent">
          Pro Gradus
        </span>
        <button
          type="button"
          onClick={openMenu}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-3 md:pb-8 lg:max-w-4xl">
        <Link
          href={leaderboardHref}
          onClick={() => restoreCompeteLeaderboardScroll()}
          className="mb-2 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Leaderboard
        </Link>
        <h1 className="text-[23px] font-bold leading-tight">Compare athletes</h1>
        <p className="mt-3 text-sm text-muted">
          Select two athletes from this leaderboard.
        </p>

        {roster.length < 2 ? (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-muted">
              Need at least two ranked athletes for {board?.activity.name ?? "this event"}.
            </p>
            <Link href={leaderboardHref} className="text-sm font-medium text-accent">
              Back to leaderboard
            </Link>
          </div>
        ) : showResults && lineup && compareReady ? (
          <div className="mt-6">
            <p className="text-sm text-muted">
              {board?.activity.name} · {filterLine}
            </p>
            <button
              type="button"
              onClick={() => setShowResults(false)}
              className="mt-4 text-sm font-medium text-accent"
            >
              Change athletes
            </button>
            <AthleteLineup view={lineup} />
          </div>
        ) : (
          <>
            <ul className="mt-4 divide-y divide-[#30373B]">
              {roster.map((e) => {
                const isSelected = selected.includes(e.studentId);
                const atLimit = selected.length >= 2 && !isSelected;
                const value = board
                  ? formatActivityValue(e.value, board.activity.unit, board.activity.slug)
                  : "—";
                return (
                  <li key={e.studentId}>
                    <button
                      type="button"
                      disabled={atLimit}
                      aria-pressed={isSelected}
                      onClick={() => toggle(e.studentId)}
                      className={cn(
                        "flex w-full min-h-[61px] items-center gap-3 py-3 text-left",
                        atLimit && "opacity-50"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                          isSelected
                            ? "border-accent bg-accent text-accent-foreground"
                            : "border-muted"
                        )}
                        aria-hidden
                      >
                        {isSelected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-semibold">
                        <LeaderboardEntryName
                          name={e.displayName}
                          nameHidden={e.nameHidden ?? isHiddenStudentLeaderboardLabel(e.displayName)}
                        />
                      </span>
                      <span className="shrink-0 text-sm font-bold tabular-nums">{value}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              disabled={!compareReady}
              onClick={runCompare}
              className={cn(
                "btn-primary mt-6 flex w-full items-center justify-center rounded-[10px] py-3 text-base font-bold",
                !compareReady && "opacity-50"
              )}
            >
              {compareReady
                ? "Compare athletes"
                : `Choose ${2 - selected.length} athlete${selected.length === 1 ? "" : "s"}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function CompeteCompareView(props: React.ComponentProps<typeof CompareInner>) {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted">Loading…</p>}>
      <CompareInner {...props} />
    </Suspense>
  );
}
