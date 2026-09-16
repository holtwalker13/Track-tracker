import { prisma } from "@/lib/db";
import { rankResults } from "@/lib/services/leaderboard";
import type { ScoringDirection } from "@/lib/constants";

export async function getCoachDashboard(schoolId: string) {
  const currentYear = await prisma.schoolYear.findFirst({
    where: { schoolId, isCurrent: true },
  });
  if (!currentYear) {
    return {
      studentsTested: 0,
      sessions: 0,
      testsCompleted: 0,
      prsMonth: 0,
      recentSessions: [],
      topPerformers: [],
      missingCount: 0,
    };
  }

  const monthStart = new Date();
  monthStart.setDate(1);

  const [testsCompleted, prsMonth, sessions, recentSessions] = await Promise.all([
    prisma.performanceResult.count({
      where: {
        schoolId,
        schoolYearId: currentYear.id,
        status: "COMPLETED",
        isBestAttempt: true,
      },
    }),
    prisma.performanceResult.count({
      where: {
        schoolId,
        isPersonalRecord: true,
        testingDate: { gte: monthStart },
      },
    }),
    prisma.testingSession.count({ where: { schoolId, schoolYearId: currentYear.id } }),
    prisma.testingSession.findMany({
      where: { schoolId },
      orderBy: { testingDate: "desc" },
      take: 5,
      include: { schoolYear: true },
    }),
  ]);

  const studentsTested = await prisma.performanceResult.groupBy({
    by: ["studentId"],
    where: {
      schoolId,
      schoolYearId: currentYear.id,
      status: "COMPLETED",
    },
  });

  const vj = await prisma.activity.findUnique({ where: { slug: "vertical-jump" } });
  let topPerformers: { name: string; value: number }[] = [];
  if (vj) {
    const rows = await prisma.performanceResult.findMany({
      where: {
        schoolId,
        schoolYearId: currentYear.id,
        activityId: vj.id,
        status: "COMPLETED",
        isBestAttempt: true,
        resultValue: { not: null },
      },
      include: { student: true },
    });
    const ranked = rankResults(
      rows.map((r) => ({
        studentId: r.studentId,
        value: r.resultValue!,
        student: r.student,
      })),
      vj.scoringDirection as ScoringDirection
    ).slice(0, 5);
    topPerformers = ranked.map((r) => ({
      name: `${(r as { student: { firstName: string; lastName: string } }).student.firstName} ${(r as { student: { lastName: string } }).student.lastName}`,
      value: r.value,
    }));
  }

  const enrolled = await prisma.studentEnrollment.count({
    where: { schoolYearId: currentYear.id },
  });
  const missingCount = Math.max(0, enrolled - studentsTested.length);

  return {
    studentsTested: studentsTested.length,
    sessions,
    testsCompleted,
    prsMonth,
    recentSessions,
    topPerformers,
    missingCount,
  };
}

export async function listStudents(schoolId: string, filters: { grade?: number; search?: string }) {
  const currentYear = await prisma.schoolYear.findFirst({
    where: { schoolId, isCurrent: true },
  });

  const students = await prisma.studentProfile.findMany({
    where: {
      schoolId,
      ...(filters.search
        ? {
            OR: [
              { firstName: { contains: filters.search } },
              { lastName: { contains: filters.search } },
              { studentNumber: { contains: filters.search } },
            ],
          }
        : {}),
      ...(filters.grade && currentYear
        ? {
            enrollments: {
              some: { schoolYearId: currentYear.id, gradeLevel: filters.grade },
            },
          }
        : {}),
    },
    include: {
      enrollments: {
        where: currentYear ? { schoolYearId: currentYear.id } : undefined,
      },
      performanceResults: {
        where: { status: "COMPLETED", isBestAttempt: true },
        orderBy: { testingDate: "desc" },
        take: 1,
      },
    },
    orderBy: { lastName: "asc" },
    take: 200,
  });

  return students.map((s) => ({
    id: s.id,
    name: `${s.firstName} ${s.lastName}`,
    studentNumber: s.studentNumber,
    grade: s.enrollments[0]?.gradeLevel,
    testsCompleted: s.performanceResults.length,
    latestTest: s.performanceResults[0]?.testingDate,
    prs: 0,
  }));
}

export async function getLeaderboard(
  schoolId: string,
  activitySlug: string,
  anonymize: boolean,
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
      ...(gradeLevel ? { gradeLevel } : {}),
    },
    include: { student: true },
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
        displayName: anonymize
          ? `Student ${st.anonymousId}`
          : `${st.firstName} ${st.lastName}`,
        grade: st,
      };
    }),
  };
}
