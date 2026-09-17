import { prisma } from "@/lib/db";
import { classYearLabel, DEFAULT_CLASS_YEAR } from "@/lib/grades";
import { getPeerBenchmark, percentileForResult } from "./benchmarks";
import { calculateImprovement } from "@/lib/services/performance";
import { calculateCategoryScores } from "@/lib/services/category-score";
import type { ScoringDirection } from "@/lib/constants";

export async function getStudentContext(studentId: string) {
  const student = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: studentId },
    include: {
      school: true,
      enrollments: {
        where: { schoolYear: { isCurrent: true } },
        include: { schoolYear: true },
      },
    },
  });
  const currentEnrollment = student.enrollments[0];
  return { student, currentGrade: currentEnrollment?.gradeLevel ?? DEFAULT_CLASS_YEAR };
}

export async function getStudentScorecard(studentId: string, gradeLevel: number) {
  const activities = await prisma.activity.findMany({
    where: {
      slug: {
        in: [
          "vertical-jump",
          "standing-broad-jump",
          "40-yard-dash",
          "flying-10-meter",
        ],
      },
    },
    include: { category: true },
  });

  const cards = [];
  for (const act of activities) {
    const latest = await prisma.performanceResult.findFirst({
      where: {
        studentId,
        activityId: act.id,
        status: "COMPLETED",
        isBestAttempt: true,
      },
      orderBy: { testingDate: "desc" },
    });
    if (!latest?.resultValue) continue;

    const priorYear = await prisma.performanceResult.findFirst({
      where: {
        studentId,
        activityId: act.id,
        status: "COMPLETED",
        isBestAttempt: true,
        schoolYear: { isCurrent: false },
      },
      orderBy: { testingDate: "desc" },
    });

    const percentile = await percentileForResult(
      act.id,
      gradeLevel,
      latest.resultValue,
      act.scoringDirection as ScoringDirection
    );

    let yoy: string | null = null;
    if (priorYear?.resultValue) {
      const imp = calculateImprovement(
        latest.resultValue,
        priorYear.resultValue,
        act.scoringDirection as ScoringDirection
      );
      if (imp.percent != null) {
        yoy = `${imp.percent >= 0 ? "↑" : "↓"} ${Math.abs(imp.percent).toFixed(0)}% YoY`;
      }
    }

    cards.push({
      activity: act,
      value: latest.resultValue,
      display: latest.displayValue ?? String(latest.resultValue),
      percentile,
      yoy,
      isPr: latest.isPersonalRecord,
    });
  }
  return cards;
}

export async function getCategoryRadar(studentId: string, gradeLevel: number) {
  const results = await prisma.performanceResult.findMany({
    where: { studentId, status: "COMPLETED", isBestAttempt: true },
    include: { activity: { include: { category: true } } },
    orderBy: { testingDate: "desc" },
  });
  const seen = new Set<string>();
  const items = [];
  for (const r of results) {
    if (seen.has(r.activityId) || !r.resultValue) continue;
    seen.add(r.activityId);
    const b = await percentileForResult(
      r.activityId,
      gradeLevel,
      r.resultValue,
      r.activity.scoringDirection as ScoringDirection
    );
    if (b == null) continue;
    const bench = await getPeerBenchmark(
      r.activityId,
      gradeLevel,
      r.activity.scoringDirection as ScoringDirection
    );
    if (!bench) continue;
    items.push({
      categorySlug: r.activity.category.slug,
      categoryName: r.activity.category.name,
      value: r.resultValue,
      benchmark: bench,
      direction: r.activity.scoringDirection as ScoringDirection,
    });
  }
  const scores = calculateCategoryScores(items);
  return scores.map((s) => ({ category: s.categoryName, score: s.score }));
}

export async function getProgressSeries(studentId: string, activitySlug: string) {
  const activity = await prisma.activity.findUnique({ where: { slug: activitySlug } });
  if (!activity) return null;

  const results = await prisma.performanceResult.findMany({
    where: {
      studentId,
      activityId: activity.id,
      status: "COMPLETED",
      isBestAttempt: true,
    },
    orderBy: { testingDate: "asc" },
  });

  const byGrade = new Map<number, number>();
  for (const r of results) {
    if (r.resultValue != null) byGrade.set(r.gradeLevel, r.resultValue);
  }

  const benchRows = await prisma.benchmarkValue.findMany({
    where: { activityId: activity.id },
    orderBy: { gradeLevel: "asc" },
  });
  const benchByGrade = new Map(benchRows.map((b) => [b.gradeLevel!, b.p50]));

  const data = Array.from(byGrade.entries()).map(([grade, value]) => ({
    label: classYearLabel(grade),
    value,
    benchmark: benchByGrade.get(grade),
  }));

  const first = data[0]?.value;
  const last = data[data.length - 1]?.value;
  let summary = null;
  if (first != null && last != null) {
    const imp = calculateImprovement(
      last,
      first,
      activity.scoringDirection as ScoringDirection
    );
    summary = imp;
  }

  return { activity, data, summary };
}
