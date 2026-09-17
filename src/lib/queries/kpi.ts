import { prisma } from "@/lib/db";
import type { ScoringDirection } from "@/lib/constants";
import {
  evaluateSprintPotential,
  type KpiMark,
  type KpiMetricSlug,
  type SprintPotential,
} from "@/lib/kpi-targets";

const KPI_SLUGS: KpiMetricSlug[] = [
  "flying-10-meter",
  "standing-broad-jump",
  "vertical-jump",
  "squat-relative",
  "hang-clean-relative",
  "20-meter-start",
  "40-yard-dash",
];

export async function getStudentSprintPotential(studentId: string): Promise<SprintPotential> {
  const student = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: studentId },
    select: { gender: true },
  });

  const activities = await prisma.activity.findMany({
    where: { slug: { in: KPI_SLUGS } },
    select: { id: true, slug: true },
  });
  const idToSlug = new Map(activities.map((a) => [a.id, a.slug as KpiMetricSlug]));

  const results = await prisma.performanceResult.findMany({
    where: {
      studentId,
      activityId: { in: activities.map((a) => a.id) },
      status: "COMPLETED",
      isBestAttempt: true,
      resultValue: { not: null },
    },
    orderBy: { testingDate: "desc" },
  });

  const seen = new Set<string>();
  const marks: KpiMark[] = [];
  for (const r of results) {
    const slug = idToSlug.get(r.activityId);
    if (!slug || seen.has(slug) || r.resultValue == null) continue;
    seen.add(slug);
    marks.push({ slug, value: r.resultValue });
  }

  return evaluateSprintPotential(marks, student.gender);
}
