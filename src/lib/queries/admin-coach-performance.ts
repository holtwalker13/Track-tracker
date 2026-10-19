import { PE_FITNESS_METRIC_SLUGS, semesterLabel, semesterSortKey } from "@/lib/admin/pe-fitness-metrics";
import type { ScoringDirection } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { calculateImprovement } from "@/lib/services/performance";

export type CoachPerformanceRow = {
  coachId: string;
  coachName: string;
  schoolId: string;
  schoolName: string;
  classCount: number;
  studentCount: number;
  /** Mean percent improvement Fall → latest Spring (student-metric pairs). */
  avgImprovementPct: number | null;
  pairsCompared: number;
  improvedPairs: number;
  byMetric: Record<
    string,
    { avgImprovementPct: number | null; pairs: number; improved: number }
  >;
  bySemester: { semester: string; avgValueByMetric: Record<string, number | null> }[];
};

export type DistrictPerformanceSnapshot = {
  organizationName: string;
  schoolCount: number;
  coachCount: number;
  metrics: { slug: string; name: string; unit: string; direction: ScoringDirection }[];
  coaches: CoachPerformanceRow[];
  semesters: string[];
};

export async function getDistrictCoachPerformance(): Promise<DistrictPerformanceSnapshot | null> {
  const org = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  if (!org) return null;

  const schools = await prisma.school.findMany({
    where: { organizationId: org.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  if (schools.length === 0) return null;

  const schoolIds = schools.map((s) => s.id);

  const activities = await prisma.activity.findMany({
    where: { slug: { in: [...PE_FITNESS_METRIC_SLUGS] } },
    select: { id: true, slug: true, name: true, unit: true, scoringDirection: true },
  });
  const activityBySlug = new Map(activities.map((a) => [a.slug, a]));

  const coaches = await prisma.coachProfile.findMany({
    where: { schoolId: { in: schoolIds } },
    include: {
      user: { select: { firstName: true, lastName: true } },
      school: { select: { name: true } },
    },
  });

  const classes = await prisma.class.findMany({
    where: { schoolId: { in: schoolIds } },
    select: {
      id: true,
      coachId: true,
      schoolId: true,
      enrollments: { select: { studentId: true } },
    },
  });

  const coachByClass = new Map(classes.map((c) => [c.id, c.coachId]));
  const studentsByCoach = new Map<string, Set<string>>();
  const classCountByCoach = new Map<string, number>();

  for (const c of classes) {
    if (!c.coachId) continue;
    classCountByCoach.set(c.coachId, (classCountByCoach.get(c.coachId) ?? 0) + 1);
    const set = studentsByCoach.get(c.coachId) ?? new Set<string>();
    for (const e of c.enrollments) set.add(e.studentId);
    studentsByCoach.set(c.coachId, set);
  }

  const studentPrimaryCoach = new Map<string, string>();
  for (const c of classes) {
    if (!c.coachId) continue;
    for (const e of c.enrollments) {
      if (!studentPrimaryCoach.has(e.studentId)) {
        studentPrimaryCoach.set(e.studentId, c.coachId);
      }
    }
  }

  const results = await prisma.performanceResult.findMany({
    where: {
      schoolId: { in: schoolIds },
      activityId: { in: activities.map((a) => a.id) },
      status: "COMPLETED",
      resultValue: { not: null },
    },
    select: {
      studentId: true,
      activityId: true,
      resultValue: true,
      testingDate: true,
      activity: { select: { slug: true, scoringDirection: true } },
      testingSession: { select: { classId: true } },
    },
  });

  type Cell = { value: number; direction: ScoringDirection };
  const grid = new Map<string, Map<string, Map<string, Cell>>>();

  for (const r of results) {
    if (r.resultValue == null) continue;
    const coachId =
      (r.testingSession?.classId ? coachByClass.get(r.testingSession.classId) : null) ??
      studentPrimaryCoach.get(r.studentId);
    if (!coachId) continue;
    const sem = semesterLabel(r.testingDate);
    const slug = r.activity.slug;
    if (!grid.has(coachId)) grid.set(coachId, new Map());
    const byStudent = grid.get(coachId)!;
    if (!byStudent.has(r.studentId)) byStudent.set(r.studentId, new Map());
    const bySem = byStudent.get(r.studentId)!;
    const key = `${slug}::${sem}`;
    const existing = bySem.get(key);
    const direction = r.activity.scoringDirection as ScoringDirection;
    if (!existing) {
      bySem.set(key, { value: r.resultValue, direction });
    } else {
      const better =
        direction === "HIGHER_BETTER"
          ? r.resultValue > existing.value
          : r.resultValue < existing.value;
      if (better) bySem.set(key, { value: r.resultValue, direction });
    }
  }

  const semesterSet = new Set<string>();
  for (const r of results) semesterSet.add(semesterLabel(r.testingDate));
  const semesters = [...semesterSet].sort((a, b) => semesterSortKey(a) - semesterSortKey(b));

  const coachRows: CoachPerformanceRow[] = coaches.map((coach) => {
    const coachName = `${coach.user.firstName} ${coach.user.lastName}`.trim();
    const byMetric: CoachPerformanceRow["byMetric"] = {};
    for (const slug of PE_FITNESS_METRIC_SLUGS) {
      byMetric[slug] = { avgImprovementPct: null, pairs: 0, improved: 0 };
    }

    const improvements: number[] = [];
    let improvedPairs = 0;
    let pairsCompared = 0;

    const studentMap = grid.get(coach.id);
    if (studentMap) {
      for (const [, bySem] of studentMap) {
        for (const slug of PE_FITNESS_METRIC_SLUGS) {
          const fall = [...bySem.entries()].find(([k]) => k.startsWith(`${slug}::Fall`));
          const spring = [...bySem.entries()]
            .filter(([k]) => k.startsWith(`${slug}::Spring`))
            .sort(([a], [b]) => semesterSortKey(b.split("::")[1]!) - semesterSortKey(a.split("::")[1]!))[0];
          if (!fall || !spring) continue;
          const { percent } = calculateImprovement(
            spring[1].value,
            fall[1].value,
            fall[1].direction
          );
          if (percent == null || !Number.isFinite(percent)) continue;
          pairsCompared++;
          const m = byMetric[slug];
          m.pairs++;
          improvements.push(percent);
          m.avgImprovementPct =
            m.avgImprovementPct == null
              ? percent
              : m.avgImprovementPct + (percent - m.avgImprovementPct) / m.pairs;
          if (percent > 0) {
            improvedPairs++;
            m.improved++;
          }
        }
      }
    }

    const bySemester: CoachPerformanceRow["bySemester"] = semesters.map((semester) => {
      const avgValueByMetric: Record<string, number | null> = {};
      for (const slug of PE_FITNESS_METRIC_SLUGS) avgValueByMetric[slug] = null;
      if (!studentMap) return { semester, avgValueByMetric };

      for (const slug of PE_FITNESS_METRIC_SLUGS) {
        const vals: number[] = [];
        for (const [, bySem] of studentMap) {
          const cell = bySem.get(`${slug}::${semester}`);
          if (cell) vals.push(cell.value);
        }
        if (vals.length) {
          avgValueByMetric[slug] = vals.reduce((a, b) => a + b, 0) / vals.length;
        }
      }
      return { semester, avgValueByMetric };
    });

    return {
      coachId: coach.id,
      coachName,
      schoolId: coach.schoolId,
      schoolName: coach.school.name,
      classCount: classCountByCoach.get(coach.id) ?? 0,
      studentCount: studentsByCoach.get(coach.id)?.size ?? 0,
      avgImprovementPct:
        improvements.length > 0
          ? improvements.reduce((a, b) => a + b, 0) / improvements.length
          : null,
      pairsCompared,
      improvedPairs,
      byMetric,
      bySemester,
    };
  });

  coachRows.sort((a, b) => (b.avgImprovementPct ?? -999) - (a.avgImprovementPct ?? -999));

  return {
    organizationName: org.name,
    schoolCount: schools.length,
    coachCount: coaches.length,
    metrics: PE_FITNESS_METRIC_SLUGS.map((slug) => {
      const a = activityBySlug.get(slug);
      return {
        slug,
        name: a?.name ?? slug,
        unit: a?.unit ?? "",
        direction: (a?.scoringDirection ?? "HIGHER_BETTER") as ScoringDirection,
      };
    }).filter((m) => activityBySlug.has(m.slug)),
    coaches: coachRows,
    semesters,
  };
}
