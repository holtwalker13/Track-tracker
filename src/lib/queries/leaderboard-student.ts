import { prisma } from "@/lib/db";
import { rankResults } from "@/lib/services/leaderboard";
import { leaderboardEntryName } from "@/lib/queries/coach";
import type { ScoringDirection } from "@/lib/constants";

export async function getStudentLeaderboard(
  schoolId: string,
  activitySlug: string,
  viewerStudentId: string,
  gradeLevel?: number
) {
  const activity = await prisma.activity.findUniqueOrThrow({ where: { slug: activitySlug } });
  const currentYear = await prisma.schoolYear.findFirst({
    where: { schoolId, isCurrent: true },
  });
  if (!currentYear) return { activity, entries: [] };

  const results = await prisma.performanceResult.findMany({
    where: {
      schoolId,
      schoolYearId: currentYear.id,
      activityId: activity.id,
      status: "COMPLETED",
      isBestAttempt: true,
      resultValue: { not: null },
      ...(gradeLevel
        ? { gradeLevel: { in: Array.isArray(gradeLevel) ? gradeLevel : [gradeLevel] } }
        : {}),
    },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          schoolId: true,
          nameHidden: true,
        },
      },
    },
  });

  const ranked = rankResults(
    results.map((r) => ({ studentId: r.studentId, value: r.resultValue! })),
    activity.scoringDirection as ScoringDirection
  );

  return {
    activity,
    entries: ranked.map((e) => {
      const st = results.find((r) => r.studentId === e.studentId)!.student;
      return {
        rank: e.rank,
        value: e.value,
        studentId: st.id,
        displayName: leaderboardEntryName(st, {
          role: "STUDENT",
          studentId: viewerStudentId,
          schoolId,
        }),
      };
    }),
  };
}
