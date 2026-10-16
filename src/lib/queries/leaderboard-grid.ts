import { prisma } from "@/lib/db";
import { getLeaderboard } from "./coach";
import { activityDisplayGroup, type ActivityDisplayGroup } from "@/lib/activity-groups";
import type { Activity, ActivityCategory } from "@prisma/client";
import { DEFAULT_AGE_BRACKET } from "@/lib/age-brackets";
import { DEFAULT_LEADERBOARD_PERIOD, type LeaderboardPeriod } from "@/lib/leaderboard-periods";

export const LEADERBOARD_MAX_N = 500;

export async function getLeaderboardActivities(
  schoolId: string,
  opts: {
    classId?: string | null;
    subgroupId?: string | null;
    kpiSetId?: string | null;
    gender?: string;
    ageBracket?: string;
  } = {}
) {
  const hidden = await prisma.schoolHiddenKpi.findMany({
    where: { schoolId },
    select: { metricSlug: true },
  });
  const hiddenSlugs = hidden.map((h) => h.metricSlug);

  const { getRankedKpiSlugsForSchool, getRankedMetricSlugs } = await import(
    "@/lib/services/kpi-sets"
  );
  const medalOpts = {
    gender: opts.gender,
    ageBracket: opts.ageBracket ?? DEFAULT_AGE_BRACKET,
  };

  // Same ranked KPI list as KPI tab, roster columns, and Compete compare.
  let rankedList: string[];
  if (opts.kpiSetId !== undefined) {
    rankedList = opts.kpiSetId
      ? await getRankedMetricSlugs(opts.kpiSetId, { schoolId, ...medalOpts })
      : [];
  } else {
    rankedList = await getRankedKpiSlugsForSchool(
      schoolId,
      opts.classId ?? null,
      opts.subgroupId ?? null,
      medalOpts
    );
  }

  const slugFilter = rankedList.filter((s) => !hiddenSlugs.includes(s));
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

  return ordered;
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
    studentLeaderboardDisplayMode?: "PSEUDONYM" | "LEGAL_NAME";
  },
  classId?: string,
  period: LeaderboardPeriod = DEFAULT_LEADERBOARD_PERIOD,
  kpiSetId?: string | null,
  subgroupId?: string | null
) {
  const activities = await getLeaderboardActivities(schoolId, {
    classId: classId ?? null,
    subgroupId: subgroupId ?? null,
    kpiSetId,
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
