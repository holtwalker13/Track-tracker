import { prisma } from "@/lib/db";
import { getLeaderboard } from "./coach";
import { activityDisplayGroup, type ActivityDisplayGroup } from "@/lib/activity-groups";
import { KPI_METRIC_META } from "@/lib/kpi-targets";
import type { Activity, ActivityCategory } from "@prisma/client";
import { DEFAULT_AGE_BRACKET } from "@/lib/age-brackets";
import { DEFAULT_LEADERBOARD_PERIOD, type LeaderboardPeriod } from "@/lib/leaderboard-periods";

export const LEADERBOARD_MAX_N = 500;

export async function getLeaderboardActivities(
  schoolId: string,
  kpiSetId?: string | null,
  medalOpts?: { gender?: string; ageBracket?: string }
) {
  const featured = ["40-yard-dash", "vertical-jump"];
  const hidden = await prisma.schoolHiddenKpi.findMany({
    where: { schoolId },
    select: { metricSlug: true },
  });
  const hiddenSlugs = hidden.map((h) => h.metricSlug);

  const {
    getRankedMetricSlugs,
    resolveKpiSetForClassContext,
    ensureSchoolDefaultKpiSetId,
  } = await import("@/lib/services/kpi-sets");
  const resolvedSetId =
    kpiSetId !== undefined
      ? kpiSetId
      : (await resolveKpiSetForClassContext(schoolId, null, null)) ??
        (await ensureSchoolDefaultKpiSetId(schoolId));
  // Leaderboards show exactly the governing set's ranked KPIs (the same list
  // the KPIs tab configures). Explicit null = class/subgroup scope with no set.
  // Only when no set can exist at all (no coach profile) do we fall back to catalog.
  const rankedSlugs = new Set(
    resolvedSetId
      ? await getRankedMetricSlugs(resolvedSetId, {
          schoolId,
          gender: medalOpts?.gender,
          ageBracket: medalOpts?.ageBracket ?? DEFAULT_AGE_BRACKET,
        })
      : kpiSetId === null
        ? []
        : KPI_METRIC_META.map((m) => m.slug as string)
  );

  const slugFilter = [...rankedSlugs].filter((s) => !hiddenSlugs.includes(s));
  const { expandRankedSlugsToQuerySlugs } = await import("@/lib/kpi-marks");
  const querySlugs =
    slugFilter.length > 0
      ? await expandRankedSlugsToQuerySlugs(schoolId, slugFilter)
      : [];

  const fetched =
    querySlugs.length > 0
      ? await prisma.activity.findMany({
          where: {
            slug: { in: querySlugs },
            OR: [{ schoolId: null }, { schoolId }],
          },
          include: { category: true },
        })
      : [];

  const bySlug = new Map(fetched.map((a) => [a.slug, a]));
  const { resolveRankedSlugToActivitySlugs } = await import("@/lib/kpi-marks");
  const ordered: typeof fetched = [];
  for (const ranked of slugFilter) {
    const candidates = await resolveRankedSlugToActivitySlugs(schoolId, ranked);
    const act = candidates.map((s) => bySlug.get(s)).find(Boolean);
    if (act) ordered.push(act);
  }

  return [...ordered].sort((a, b) => {
    const ai = featured.indexOf(a.slug);
    const bi = featured.indexOf(b.slug);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return 0;
  });
}

export type LeaderboardBoardEntry = {
  rank: number;
  value: number;
  displayName: string;
  studentId: string;
  testingDate?: string;
  linkable?: boolean;
};

export type LeaderboardBoard = {
  activity: Activity & { category: ActivityCategory };
  group: ActivityDisplayGroup;
  entries: LeaderboardBoardEntry[];
};

export async function getLeaderboardGrid(
  schoolId: string,
  gradeLevels?: number[],
  gender?: string,
  scope: "school" | "global" = "school",
  viewer?: {
    role: "ADMIN" | "COACH" | "STUDENT";
    studentId?: string;
    schoolId: string;
  },
  classId?: string,
  period: LeaderboardPeriod = DEFAULT_LEADERBOARD_PERIOD,
  kpiSetId?: string | null,
  subgroupId?: string | null
) {
  const { resolveKpiSetForCompeteScope } = await import("@/lib/services/kpi-sets");
  const setId =
    kpiSetId ?? (await resolveKpiSetForCompeteScope(schoolId, classId ?? null, subgroupId ?? null));
  const activities = await getLeaderboardActivities(schoolId, setId, {
    gender,
    ageBracket: DEFAULT_AGE_BRACKET,
  });
  const grades = gradeLevels && gradeLevels.length > 0 ? gradeLevels : undefined;

  const boards: LeaderboardBoard[] = [];

  for (const act of activities) {
    const { entries } = await getLeaderboard(schoolId, act.slug, {
      gradeLevels: grades,
      gender,
      scope,
      viewer,
      classId,
      period,
    });

    boards.push({
      activity: act,
      entries,
      group: activityDisplayGroup(act.slug, act.category.slug),
    });
  }

  return { boards, gradeLevels: grades ?? null };
}
