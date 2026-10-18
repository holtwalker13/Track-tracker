"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GitCompareArrows, SlidersHorizontal } from "lucide-react";
import { GroupContextButton } from "@/components/coach-scope/group-context-button";
import { MobileCoachHeader } from "@/components/layout/mobile-coach-header";
import type { LeaderboardBoard } from "@/lib/queries/leaderboard-grid";
import {
  buildLeaderboardSearchParams,
  filterSummaryShort,
  parseLeaderboardSearchParams,
  type CommittedLeaderboardQuery,
  type DraftFilterSelection,
  type DraftGroupSelection,
} from "@/lib/compete/query-state";
import type {
  ScopeCoachOption,
  ScopeClassOption,
  ScopeSubgroupOption,
} from "@/components/coach/coach-class-scope-bar";
import { GroupPickerSheet } from "@/components/compete/group-picker-sheet";
import { FiltersSheet } from "@/components/compete/filters-sheet";
import { KpiBoardsPanel } from "@/components/compete/kpi-boards-panel";
import {
  groupContextPrimaryLine,
  groupContextSecondaryLine,
} from "@/lib/coach-scope/labels";
import { persistCoachGroupScope } from "@/lib/coach-scope/persist";
import { cn } from "@/lib/utils";

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [groupOpen, setGroupOpen] = useState(needsClassChoice);
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

  const pushQuery = useCallback(
    (patch: Partial<CommittedLeaderboardQuery>) => {
      const next: CommittedLeaderboardQuery = {
        ...committed,
        ...patch,
        eventSlug: patch.eventSlug ?? committed.eventSlug ?? defaultEvent,
      };
      const params = buildLeaderboardSearchParams(next, searchParams);
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [committed, defaultEvent, pathname, router, searchParams, startTransition]
  );

  useEffect(() => {
    restoreCompeteLeaderboardScroll();
  }, []);

  const coach = coaches.find((c) => c.id === committed.coachId);

  const classTitle = groupContextPrimaryLine({
    classId: committed.classId,
    classes,
    allClassesLabel,
  });
  const contextLine = groupContextSecondaryLine({
    schoolName,
    coach,
    subgroupId: committed.subgroupId,
    subgroups,
  });

  const filterSummary = filterSummaryShort(committed);
  const kpiCount = boards.length;
  const athletesRanked = boards.reduce((sum, b) => sum + b.entries.length, 0);

  function saveScrollForCompare() {
    try {
      sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    } catch {
      /* ignore */
    }
  }

  return (
    <div className={cn(pending && "opacity-60")} aria-busy={pending}>
      <MobileCoachHeader title="Leaderboard" />

      <div className="mx-auto w-full max-w-3xl px-4 pb-4 pt-3 md:px-4 md:pb-8 md:pt-4 lg:max-w-4xl">
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

        <GroupContextButton
          primaryLine={classTitle}
          secondaryLine={contextLine}
          onClick={() => setGroupOpen(true)}
          className="mb-3.5"
        />

        {needsClassChoice ? (
          <p className="mb-3 text-sm text-muted">Choose a class to see rankings.</p>
        ) : null}

        <div className="mb-1 flex items-start justify-between gap-3 border-b border-[#30373B] pb-2">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="inline-flex min-h-11 max-w-[70%] items-center gap-1.5 text-left text-xs text-muted"
          >
            <span className="min-w-0 break-words">{filterSummary}</span>
            <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
          </button>
          <span className="shrink-0 pt-2 text-right text-xs text-muted">
            {kpiCount} KPI{kpiCount === 1 ? "" : "s"}
            {!needsClassChoice && athletesRanked > 0 ? (
              <>
                <br />
                <span className="text-muted/90">{athletesRanked} ranked</span>
              </>
            ) : null}
          </span>
        </div>

        {!needsClassChoice ? (
          <KpiBoardsPanel
            boards={boards}
            athleteHrefBase={athleteHrefBase}
            rankScope={rankScope}
            loading={pending}
          />
        ) : null}

        {!pending && !needsClassChoice && boards.length > 0 && athletesRanked === 0 ? (
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
        applyLabel="Show leaderboard"
        onApply={(draft: DraftGroupSelection) => {
          setGroupOpen(false);
          void persistCoachGroupScope(draft);
          pushQuery({
            coachId: draft.coachId,
            classId: draft.classId,
            subgroupId: draft.subgroupId ? draft.subgroupId : null,
          });
        }}
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
    <Suspense
      fallback={
        <KpiBoardsPanel boards={[]} athleteHrefBase={props.athleteHrefBase} loading />
      }
    >
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
