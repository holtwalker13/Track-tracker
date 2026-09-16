import { prisma } from "@/lib/db";
import { getLeaderboard } from "./coach";
import { percentileForResult } from "./benchmarks";
import type { ScoringDirection } from "@/lib/constants";
import { activityDisplayGroup, type ActivityDisplayGroup } from "@/lib/activity-groups";
import type { Activity, ActivityCategory } from "@prisma/client";

export const LEADERBOARD_TOP_N = 10;

export async function getLeaderboardActivities() {
  return prisma.activity.findMany({
    where: { slug: { notIn: ["height", "weight"] } },
    include: { category: true },
    orderBy: { name: "asc" },
  });
}

export type LeaderboardBoardEntry = {
  rank: number;
  value: number;
  displayName: string;
  studentId: string;
  percentile: number | null;
};

export type LeaderboardBoard = {
  activity: Activity & { category: ActivityCategory };
  group: ActivityDisplayGroup;
  entries: LeaderboardBoardEntry[];
};

export async function getLeaderboardGrid(
  schoolId: string,
  anonymize: boolean,
  gradeLevel?: number,
  viewerStudentId?: string
) {
  const activities = await getLeaderboardActivities();
  const grade = gradeLevel ?? 8;

  const boards: LeaderboardBoard[] = [];

  for (const act of activities) {
    const { activity, entries } = await getLeaderboard(
      schoolId,
      act.slug,
      anonymize,
      gradeLevel
    );

    const top = entries.slice(0, LEADERBOARD_TOP_N);
    const enriched = await Promise.all(
      top.map(async (e) => {
        const pct = await percentileForResult(
          activity.id,
          grade,
          e.value,
          activity.scoringDirection as ScoringDirection
        );
        let displayName = e.displayName;
        if (anonymize && viewerStudentId && e.studentId === viewerStudentId) {
          displayName = "You";
        }
        return {
          rank: e.rank,
          value: e.value,
          studentId: e.studentId,
          displayName,
          percentile: pct,
        };
      })
    );

    boards.push({
      activity: act,
      entries: enriched,
      group: activityDisplayGroup(act.slug, act.category.slug),
    });
  }

  return { boards, gradeLevel: gradeLevel ?? null };
}
