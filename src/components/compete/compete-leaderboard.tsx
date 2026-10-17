"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, GitCompareArrows, Menu, SlidersHorizontal, Zap } from "lucide-react";
import { ActivityIcon } from "@/lib/activity-icons";
import type { LeaderboardBoard } from "@/lib/queries/leaderboard-grid";
import {
  buildLeaderboardSearchParams,
  filterSummaryShort,
  markColumnLabel,
  parseLeaderboardSearchParams,
  type CommittedLeaderboardQuery,
  type DraftFilterSelection,
  type DraftGroupSelection,
} from "@/lib/compete/query-state";
import { classSectionLabel } from "@/lib/periods";
import type {
  ScopeCoachOption,
  ScopeClassOption,
  ScopeSubgroupOption,
} from "@/components/coach/coach-class-scope-bar";
import { GroupPickerSheet } from "@/components/compete/group-picker-sheet";
import { EventPickerSheet } from "@/components/compete/event-picker-sheet";
import { FiltersSheet } from "@/components/compete/filters-sheet";
import { RankingList } from "@/components/compete/ranking-list";
import { cn } from "@/lib/utils";
import { useCompeteMenu } from "@/components/compete/compete-ui-provider";

const SCROLL_KEY = "compete-leaderboard-scroll";

function CompeteLeaderboardInner({
  boards,
  schoolName,
  coaches,
  classes,
  subgroups,
  showCoach,
  showSchoolSwitcher,
  schools,
  currentSchoolId,
  defaultCoachId,
  defaultClassId,
  defaultSubgroupId,
  allClassesLabel,
  athleteHrefBase,
  rankScope,
  compareHref,
  needsClassChoice,
}: {
  boards: LeaderboardBoard[];
  schoolName: string | null;
  coaches: ScopeCoachOption[];
  classes: ScopeClassOption[];
  subgroups: ScopeSubgroupOption[];
  showCoach: boolean;
  showSchoolSwitcher: boolean;
  schools: { id: string; name: string }[];
  currentSchoolId?: string;
  defaultCoachId: string;
  defaultClassId: string;
  defaultSubgroupId: string | null;
  allClassesLabel?: string;
  athleteHrefBase?: string;
  rankScope?: "school" | "global";
  compareHref: string;
  needsClassChoice: boolean;
}) {
  const { openMenu } = useCompeteMenu();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [groupOpen, setGroupOpen] = useState(needsClassChoice);
  const [eventOpen, setEventOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const defaultEvent = boards[0]?.activity.slug ?? "";
  const committed = useMemo(
    () =>
      parseLeaderboardSearchParams(searchParams, {
        coachId: defaultCoachId,
        classId: defaultClassId,
        subgroupId: defaultSubgroupId,
        eventSlug: defaultEvent,
      }),
    [
      searchParams,
      defaultCoachId,
      defaultClassId,
      defaultSubgroupId,
      defaultEvent,
    ]
  );

  const selectedBoard =
    boards.find((b) => b.activity.slug === committed.eventSlug) ?? boards[0] ?? null;

  const effectiveEventSlug = selectedBoard?.activity.slug ?? committed.eventSlug;

  const pushQuery = useCallback(
    (patch: Partial<CommittedLeaderboardQuery>) => {
      const next: CommittedLeaderboardQuery = {
        ...committed,
        ...patch,
        eventSlug: patch.eventSlug ?? committed.eventSlug ?? effectiveEventSlug,
      };
      const params = buildLeaderboardSearchParams(next, searchParams);
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [committed, effectiveEventSlug, pathname, router, searchParams, startTransition]
  );

  useEffect(() => {
    restoreCompeteLeaderboardScroll();
  }, []);

  useEffect(() => {
    if (boards.length === 0) return;
    if (boards.some((b) => b.activity.slug === committed.eventSlug)) return;
    const fallback = boards[0]?.activity.slug;
    if (fallback) pushQuery({ eventSlug: fallback });
  }, [boards, committed.eventSlug, pushQuery]);

  const coach = coaches.find((c) => c.id === committed.coachId);
  const classOption =
    committed.classId === "all"
      ? null
      : classes.find((c) => c.id === committed.classId) ??
        classes.find((c) => c.id === defaultClassId);
  const subgroupLabel =
    committed.subgroupId && subgroups.find((s) => s.id === committed.subgroupId)
      ? subgroups.find((s) => s.id === committed.subgroupId)!.name
      : "All students";

  const classTitle =
    committed.classId === "all"
      ? allClassesLabel ?? "All classes"
      : classOption
        ? classSectionLabel(classOption)
        : "Choose a class";

  const contextLine = [
    schoolName ?? "School",
    coach ? `${coach.lastName}` : "Coach",
    subgroupLabel,
  ].join(" · ");

  const filterSummary = filterSummaryShort(committed);
  const rankedCount = selectedBoard?.entries.length ?? 0;

  function saveScrollForCompare() {
    try {
      sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    } catch {
      /* ignore */
    }
  }

  return (
    <div className={cn(pending && "opacity-60")} aria-busy={pending}>
      <header className="sticky top-0 z-30 -mx-4 flex items-center justify-between border-b border-[#30373B] bg-background px-4 py-2.5 md:hidden">
        <span className="text-xs font-bold uppercase tracking-[0.08em] text-accent">
          Pro Gradus
        </span>
        <button
          type="button"
          onClick={openMenu}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-foreground"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-3 md:px-4 md:pb-8 md:pt-4 lg:max-w-4xl">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <h1 className="text-[23px] font-bold leading-tight tracking-tight">Leaderboard</h1>
          <Link
            href={`${compareHref}?${searchParams.toString()}`}
            onClick={saveScrollForCompare}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted"
          >
            <GitCompareArrows className="h-5 w-5" aria-hidden />
            Compare
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setGroupOpen(true)}
          className="mb-3.5 flex w-full items-center gap-2.5 rounded-xl bg-[#1B2023] px-3 py-2 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{classTitle}</span>
            <span className="block text-xs text-muted">{contextLine}</span>
          </span>
          <ChevronDown className="h-5 w-5 shrink-0 text-muted" aria-hidden />
        </button>

        {needsClassChoice ? (
          <p className="mb-3 text-sm text-muted">Choose a class to see rankings.</p>
        ) : null}

        <button
          type="button"
          disabled={!selectedBoard}
          onClick={() => setEventOpen(true)}
          className="mb-3 flex min-h-11 w-full items-center gap-2 text-left text-xl font-semibold disabled:opacity-50"
        >
          {selectedBoard ? (
            <ActivityIcon
              slug={selectedBoard.activity.slug}
              categorySlug={selectedBoard.activity.category?.slug}
              className="h-5 w-5 shrink-0 text-accent"
            />
          ) : (
            <Zap className="h-5 w-5 shrink-0 text-accent" aria-hidden />
          )}
          <span className="min-w-0 flex-1 truncate">
            {selectedBoard?.activity.name ?? "Choose event"}
          </span>
          <ChevronDown className="h-5 w-5 shrink-0 text-muted" aria-hidden />
        </button>

        <div className="mb-1 flex items-start justify-between gap-3 border-b border-[#30373B] pb-2">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="inline-flex min-h-11 max-w-[70%] items-center gap-1.5 text-left text-xs text-muted"
          >
            <span className="min-w-0 break-words">{filterSummary}</span>
            <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
          </button>
          <span className="shrink-0 pt-2 text-xs text-muted">
            {rankedCount} ranked
          </span>
        </div>

        <div className="flex justify-between px-1 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          <span>Athlete</span>
          <span>{markColumnLabel()}</span>
        </div>

        <RankingList
          board={needsClassChoice ? null : selectedBoard}
          athleteHrefBase={athleteHrefBase}
          rankScope={rankScope}
          loading={pending}
        />

        {!pending && !needsClassChoice && selectedBoard && rankedCount === 0 ? (
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="mt-4 text-sm font-medium text-accent"
          >
            Open filters
          </button>
        ) : null}
      </div>

      <GroupPickerSheet
        open={groupOpen}
        onClose={() => setGroupOpen(false)}
        committed={{
          coachId: committed.coachId,
          classId: committed.classId,
          subgroupId: committed.subgroupId ?? "",
        }}
        coaches={coaches}
        initialClasses={classes}
        initialSubgroups={subgroups}
        showCoach={showCoach}
        showSchoolSwitcher={showSchoolSwitcher}
        schools={schools}
        currentSchoolId={currentSchoolId}
        schoolName={schoolName}
        allClassesLabel={allClassesLabel}
        onApply={(draft: DraftGroupSelection) => {
          setGroupOpen(false);
          pushQuery({
            coachId: draft.coachId,
            classId: draft.classId,
            subgroupId: draft.subgroupId ? draft.subgroupId : null,
          });
        }}
      />

      <EventPickerSheet
        open={eventOpen}
        onClose={() => setEventOpen(false)}
        boards={boards}
        selectedSlug={effectiveEventSlug}
        onSelect={(slug) => pushQuery({ eventSlug: slug })}
      />

      <FiltersSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        committed={{
          period: committed.period,
          gender: committed.gender,
          scope: committed.scope,
          grades: committed.grades,
        }}
        showMoreOptions
        onApply={(draft: DraftFilterSelection) => {
          setFiltersOpen(false);
          pushQuery({
            period: draft.period,
            gender: draft.gender,
            scope: draft.scope,
            grades: draft.grades,
          });
        }}
      />
    </div>
  );
}

export function CompeteLeaderboard(props: React.ComponentProps<typeof CompeteLeaderboardInner>) {
  return (
    <Suspense fallback={<RankingList board={null} loading />}>
      <CompeteLeaderboardInner {...props} />
    </Suspense>
  );
}

export function restoreCompeteLeaderboardScroll() {
  if (typeof window === "undefined") return;
  try {
    const y = sessionStorage.getItem(SCROLL_KEY);
    if (y != null) {
      sessionStorage.removeItem(SCROLL_KEY);
      requestAnimationFrame(() => window.scrollTo(0, Number(y)));
    }
  } catch {
    /* ignore */
  }
}
