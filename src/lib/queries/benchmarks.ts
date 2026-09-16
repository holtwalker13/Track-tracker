import { prisma } from "@/lib/db";
import { calculatePercentile } from "@/lib/services/benchmarks";
import type { ScoringDirection } from "@/lib/constants";

export async function getSyntheticBenchmark(activityId: string, gradeLevel: number) {
  return prisma.benchmarkValue.findFirst({
    where: { activityId, gradeLevel, dataset: { isSynthetic: true } },
    include: { dataset: true },
  });
}

export async function percentileForResult(
  activityId: string,
  gradeLevel: number,
  value: number,
  direction: ScoringDirection
) {
  const b = await getSyntheticBenchmark(activityId, gradeLevel);
  if (!b) return null;
  return calculatePercentile(value, b, direction);
}
