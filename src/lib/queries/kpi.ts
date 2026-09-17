import { prisma } from "@/lib/db";
import {
  ALL_KPI_BANDS,
  KPI_METRIC_META,
  bandsFromTargets,
  evaluateSprintPotential,
  type KpiBand,
  type KpiMark,
  type KpiMetricSlug,
  type Medal,
  type SprintPotential,
} from "@/lib/kpi-targets";

const KPI_SLUGS: KpiMetricSlug[] = KPI_METRIC_META.map((m) => m.slug);

export async function ensureSchoolKpiTargets(schoolId: string): Promise<void> {
  const count = await prisma.schoolKpiTarget.count({ where: { schoolId } });
  if (count > 0) return;
  await prisma.schoolKpiTarget.createMany({
    data: ALL_KPI_BANDS.flatMap((band) =>
      KPI_METRIC_META.map((meta) => ({
        schoolId,
        gender: band.gender,
        medal: band.medal,
        metricSlug: meta.slug,
        target: band.targets[meta.slug],
      }))
    ),
  });
}

export async function getSchoolKpiBands(schoolId: string, gender?: string | null): Promise<KpiBand[]> {
  await ensureSchoolKpiTargets(schoolId);
  const g: "F" | "M" = gender === "M" ? "M" : "F";
  const rows = await prisma.schoolKpiTarget.findMany({
    where: { schoolId, gender: g },
  });
  const byMedal = {
    gold: {} as Record<KpiMetricSlug, number>,
    silver: {} as Record<KpiMetricSlug, number>,
    bronze: {} as Record<KpiMetricSlug, number>,
  };
  for (const row of rows) {
    if (row.medal !== "gold" && row.medal !== "silver" && row.medal !== "bronze") continue;
    byMedal[row.medal as Medal][row.metricSlug as KpiMetricSlug] = row.target;
  }
  return bandsFromTargets(g, byMedal);
}

export async function getStudentSprintPotential(studentId: string): Promise<SprintPotential> {
  const student = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: studentId },
    select: { gender: true, schoolId: true },
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

  const custom = await getSchoolKpiBands(student.schoolId, student.gender);
  return evaluateSprintPotential(marks, student.gender, custom);
}
