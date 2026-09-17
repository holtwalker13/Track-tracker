import { prisma } from "@/lib/db";
import { calculatePercentile } from "@/lib/services/benchmarks";
import type { ScoringDirection } from "@/lib/constants";
import { getSchoolKpiBands } from "@/lib/queries/kpi";
import type { KpiMetricSlug } from "@/lib/kpi-targets";

function empiricalFromValues(values: number[], direction: ScoringDirection) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (p: number) => {
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
    return sorted[idx]!;
  };
  if (direction === "LOWER_BETTER") {
    return { p25: at(75), p50: at(50), p75: at(25), p90: at(10) };
  }
  return { p25: at(25), p50: at(50), p75: at(75), p90: at(90) };
}

export async function getPeerBenchmark(
  activityId: string,
  gradeLevel: number,
  direction: ScoringDirection
) {
  const rows = await prisma.performanceResult.findMany({
    where: {
      activityId,
      gradeLevel,
      status: "COMPLETED",
      isBestAttempt: true,
      resultValue: { not: null },
    },
    select: { resultValue: true },
  });
  const values = rows.map((r) => r.resultValue!).filter((v) => Number.isFinite(v));
  if (values.length < 3) return null;
  return empiricalFromValues(values, direction);
}

export async function getKpiBenchmark(activityId: string, gender?: string | null, schoolId?: string) {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { slug: true },
  });
  if (!activity) return null;
  const g: "F" | "M" = gender === "M" ? "M" : "F";
  if (schoolId) {
    const bands = await getSchoolKpiBands(schoolId, g);
    const silver = bands.find((b) => b.medal === "silver");
    const p50 = silver?.targets[activity.slug as KpiMetricSlug];
    if (p50 != null) return { p50, p25: p50, p75: p50, p90: p50 };
  }
  return prisma.benchmarkValue.findFirst({
    where: {
      activityId,
      gender: g,
      dataset: { name: { contains: "Silver" } },
    },
    include: { dataset: true },
  });
}

export async function percentileForResult(
  activityId: string,
  gradeLevel: number,
  value: number,
  direction: ScoringDirection
) {
  const peer = await getPeerBenchmark(activityId, gradeLevel, direction);
  if (peer) return calculatePercentile(value, peer, direction);
  return null;
}
