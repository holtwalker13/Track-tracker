import { prisma } from "@/lib/db";
import { rankResults } from "@/lib/services/leaderboard";
import type { ScoringDirection } from "@/lib/constants";
import { GRADE_LEVELS } from "@/lib/grades";
import {
  periodDateRange,
  type LeaderboardPeriod,
} from "@/lib/leaderboard-periods";

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

export async function listStudents(
  schoolId: string,
  filters: { grades?: number[]; search?: string; gender?: string }
) {
  const currentYear = await prisma.schoolYear.findFirst({
    where: { schoolId, isCurrent: true },
  });
  const gradeFilter =
    filters.grades && filters.grades.length > 0 && filters.grades.length < GRADE_LEVELS.length
      ? { in: filters.grades }
      : undefined;

  const students = await prisma.studentProfile.findMany({
    where: {
      schoolId,
      ...(filters.gender ? { gender: filters.gender } : {}),
      ...(filters.search
        ? {
            OR: [
              { firstName: { contains: filters.search } },
              { lastName: { contains: filters.search } },
              { studentNumber: { contains: filters.search } },
            ],
          }
        : {}),
      ...(gradeFilter && currentYear
        ? {
            enrollments: {
              some: { schoolYearId: currentYear.id, gradeLevel: gradeFilter },
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
    take: 500,
  });

  const prCounts =
    currentYear && students.length > 0
      ? await prisma.performanceResult.groupBy({
          by: ["studentId"],
          where: {
            schoolId,
            schoolYearId: currentYear.id,
            isPersonalRecord: true,
            status: "COMPLETED",
            studentId: { in: students.map((s) => s.id) },
          },
          _count: { _all: true },
        })
      : [];
  const prByStudent = new Map(prCounts.map((row) => [row.studentId, row._count._all]));

  return students.map((s) => ({
    id: s.id,
    name: `${s.firstName} ${s.lastName}`,
    studentNumber: s.studentNumber,
    anonymousId: s.anonymousId,
    nameHidden: s.nameHidden,
    grade: s.enrollments[0]?.gradeLevel,
    gender: s.gender,
    testsCompleted: s.performanceResults.length,
    latestTest: s.performanceResults[0]?.testingDate,
    prs: prByStudent.get(s.id) ?? 0,
  }));
}

export async function getLeaderboard(
  schoolId: string,
  activitySlug: string,
  opts: {
    gradeLevels?: number[];
    gender?: string;
    scope?: "school" | "global";
    classId?: string;
    period?: LeaderboardPeriod;
    viewer?: {
      role: "ADMIN" | "COACH" | "STUDENT";
      studentId?: string;
      schoolId: string;
    };
  } = {}
) {
  const activity = await prisma.activity.findUniqueOrThrow({ where: { slug: activitySlug } });
  const scope = opts.scope === "global" ? "global" : "school";
  const currentYear =
    scope === "school"
      ? await prisma.schoolYear.findFirst({
          where: { schoolId, isCurrent: true },
        })
      : null;
  if (scope === "school" && !currentYear) return { activity, entries: [] };

  const gradeFilter =
    opts.gradeLevels && opts.gradeLevels.length > 0 && opts.gradeLevels.length < GRADE_LEVELS.length
      ? { in: opts.gradeLevels }
      : undefined;

  let classStudentIds: string[] | undefined;
  if (opts.classId) {
    const enrolled = await prisma.classEnrollment.findMany({
      where: { classId: opts.classId },
      select: { studentId: true },
    });
    classStudentIds = enrolled.map((e) => e.studentId);
    if (classStudentIds.length === 0) return { activity, entries: [] };
  }

  const period = opts.period ?? "week";
  const range = periodDateRange(
    period,
    new Date(),
    currentYear
      ? { startDate: currentYear.startDate, endDate: currentYear.endDate }
      : null
  );

  const results = await prisma.performanceResult.findMany({
    where: {
      activityId: activity.id,
      status: "COMPLETED",
      isBestAttempt: true,
      resultValue: { not: null },
      testingDate: { gte: range.start, lte: range.end },
      ...(scope === "school"
        ? { schoolId, schoolYearId: currentYear!.id }
        : {}),
      ...(gradeFilter ? { gradeLevel: gradeFilter } : {}),
      ...(opts.gender ? { student: { gender: opts.gender } } : {}),
      ...(classStudentIds ? { studentId: { in: classStudentIds } } : {}),
    },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          schoolId: true,
          nameHidden: true,
          anonymousId: true,
        },
      },
    },
  });

  // Keep best mark per student within the window
  const bestByStudent = new Map<string, (typeof results)[number]>();
  for (const r of results) {
    const prev = bestByStudent.get(r.studentId);
    if (!prev) {
      bestByStudent.set(r.studentId, r);
      continue;
    }
    const direction = activity.scoringDirection as ScoringDirection;
    const better =
      direction === "LOWER_BETTER"
        ? r.resultValue! < prev.resultValue!
        : r.resultValue! > prev.resultValue!;
    if (better) bestByStudent.set(r.studentId, r);
  }
  const unique = [...bestByStudent.values()];

  const ranked = rankResults(
    unique.map((r) => ({ studentId: r.studentId, value: r.resultValue! })),
    activity.scoringDirection as ScoringDirection
  );

  return {
    activity,
    entries: ranked.slice(0, 500).map((e) => {
      const st = unique.find((r) => r.studentId === e.studentId)!.student;
      return {
        rank: e.rank,
        value: e.value,
        studentId: st.id,
        displayName: leaderboardEntryName(st, opts.viewer),
        nameHidden: st.nameHidden,
        linkable: !opts.viewer || (opts.viewer.role !== "STUDENT" && st.schoolId === opts.viewer.schoolId),
      };
    }),
  };
}

export async function getStudentActivityRanks(
  schoolId: string,
  studentId: string,
  slugs: string[],
  opts: {
    gradeLevels?: number[];
    gender?: string;
    scope?: "school" | "global";
    classId?: string;
    period?: LeaderboardPeriod;
  } = {}
) {
  const ranks: Record<string, number> = {};
  await Promise.all(
    [...new Set(slugs)].map(async (slug) => {
      const activity = await prisma.activity.findUnique({ where: { slug } });
      if (!activity) return;
      const { entries } = await getLeaderboard(schoolId, slug, opts);
      const me = entries.find((e) => e.studentId === studentId);
      if (me) ranks[slug] = me.rank;
    })
  );
  return ranks;
}

export function leaderboardEntryName(
  student: {
    id: string;
    firstName: string;
    lastName: string;
    schoolId: string;
    nameHidden: boolean;
  },
  viewer?: {
    role: "ADMIN" | "COACH" | "STUDENT";
    studentId?: string;
    schoolId: string;
  }
) {
  if (!viewer) return `${student.firstName} ${student.lastName}`;
  if (viewer.role === "COACH" || viewer.role === "ADMIN") {
    if (student.schoolId !== viewer.schoolId) return "Other school";
    return `${student.firstName} ${student.lastName}`;
  }
  if (viewer.studentId === student.id) return "You";
  if (student.schoolId !== viewer.schoolId || student.nameHidden) return "Hidden";
  return `${student.firstName} ${student.lastName}`;
}
