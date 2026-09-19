import { prisma } from "@/lib/db";
import { getLeaderboard } from "./coach";
import { percentileForResult } from "./benchmarks";
import type { ScoringDirection } from "@/lib/constants";
import { activityDisplayGroup, type ActivityDisplayGroup } from "@/lib/activity-groups";
import { DEFAULT_CLASS_YEAR, isAllGrades } from "@/lib/grades";
import type { Activity, ActivityCategory } from "@prisma/client";

export const LEADERBOARD_TOP_N = 10;

export async function getLeaderboardActivities() {
  const featured = ["40-yard-dash", "vertical-jump"];
  const activities = await prisma.activity.findMany({
    where: {
      slug: {
        notIn: ["height", "weight", "20-meter-start"],
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
  percentile: number | null;
  /** ISO timestamp when the mark was recorded (for “new on board” highlight). */
  recordedAt: string | null;
  isRecent: boolean;
};

export type LeaderboardBoard = {
  activity: Activity & { category: ActivityCategory };
  group: ActivityDisplayGroup;
  entries: LeaderboardBoardEntry[];
};

const RECENT_MS = 24 * 60 * 60 * 1000;

export async function getLeaderboardGrid(
  schoolId: string,
  anonymize: boolean,
  gradeLevels?: number[],
  viewerStudentId?: string,
  gender?: string
) {
  const activities = await getLeaderboardActivities();
  const grades = gradeLevels && gradeLevels.length > 0 ? gradeLevels : undefined;
  const percentileGrade = grades && !isAllGrades(grades) ? grades[0] : DEFAULT_CLASS_YEAR;
  const now = Date.now();

  const boards: LeaderboardBoard[] = [];

  for (const act of activities) {
    const { activity, entries } = await getLeaderboard(
      schoolId,
      act.slug,
      anonymize,
      grades,
      gender,
      viewerStudentId
    );

    const top = entries.slice(0, LEADERBOARD_TOP_N);
    const enriched = await Promise.all(
      top.map(async (e) => {
        const pct = await percentileForResult(
          activity.id,
          percentileGrade,
          e.value,
          activity.scoringDirection as ScoringDirection
        );
        let displayName = e.displayName;
        if (anonymize && viewerStudentId && e.studentId === viewerStudentId) {
          displayName = "You";
        }
        const recordedAt = e.recordedAt ?? null;
        const isRecent = Boolean(
          recordedAt && now - new Date(recordedAt).getTime() <= RECENT_MS
        );
        return {
          rank: e.rank,
          value: e.value,
          studentId: e.studentId,
          displayName,
          percentile: pct,
          recordedAt,
          isRecent,
        };
      })
    );

    boards.push({
      activity: act,
      entries: enriched,
      group: activityDisplayGroup(act.slug, act.category.slug),
    });
  }

  return { boards, gradeLevels: grades ?? null };
}
