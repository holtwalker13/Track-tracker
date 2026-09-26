import { prisma } from "@/lib/db";
import { getLeaderboard } from "./coach";
import { activityDisplayGroup, type ActivityDisplayGroup } from "@/lib/activity-groups";
import type { Activity, ActivityCategory } from "@prisma/client";
import type { LeaderboardPeriod } from "@/lib/leaderboard-periods";

export const LEADERBOARD_MAX_N = 500;

export async function getLeaderboardActivities(schoolId: string) {
  const featured = ["40-yard-dash", "vertical-jump"];
  const hidden = await prisma.schoolHiddenKpi.findMany({
    where: { schoolId },
    select: { metricSlug: true },
  });
  const hiddenSlugs = hidden.map((h) => h.metricSlug);
  const activities = await prisma.activity.findMany({
    where: {
      OR: [{ schoolId: null }, { schoolId }],
      slug: {
        notIn: ["height", "weight", "20-meter-start", ...hiddenSlugs],
      },
    },
    include: { category: true },
    orderBy: { name: "asc" },
  });
  return [...activities].sort((a, b) => {
    const ai = featured.indexOf(a.slug);
    const bi = featured.indexOf(b.slug);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return a.name.localeCompare(b.name);
  });
}

export type LeaderboardBoardEntry = {
  rank: number;
  value: number;
  displayName: string;
  studentId: string;
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
  period: LeaderboardPeriod = "week"
) {
  const activities = await getLeaderboardActivities(schoolId);
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
