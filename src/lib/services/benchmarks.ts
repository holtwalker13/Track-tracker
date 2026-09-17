import type { ScoringDirection } from "@/lib/constants";

export type PercentilePoint = {
  percentile: number;
  value: number;
};

export function interpolatePercentile(
  value: number,
  points: PercentilePoint[],
  direction: ScoringDirection
): number {
  const sorted = [...points].sort((a, b) => a.value - b.value);
  if (sorted.length === 0) return 50;

  const ascending = direction === "HIGHER_BETTER";
  const vals = ascending ? sorted : [...sorted].reverse();

  if (value <= vals[0].value) return ascending ? vals[0].percentile : vals[vals.length - 1].percentile;
  if (value >= vals[vals.length - 1].value)
    return ascending ? vals[vals.length - 1].percentile : vals[0].percentile;

  for (let i = 0; i < vals.length - 1; i++) {
    const a = vals[i];
    const b = vals[i + 1];
    if (value >= a.value && value <= b.value) {
      const t = (value - a.value) / (b.value - a.value);
      return a.percentile + t * (b.percentile - a.percentile);
    }
  }
  return 50;
}

export function calculatePercentile(
  value: number,
  benchmark: {
    p25?: number | null;
    p50: number;
    p75?: number | null;
    p90?: number | null;
  },
  direction: ScoringDirection
): number {
  const points: PercentilePoint[] = [];
  if (benchmark.p25 != null) points.push({ percentile: 25, value: benchmark.p25 });
  points.push({ percentile: 50, value: benchmark.p50 });
  if (benchmark.p75 != null) points.push({ percentile: 75, value: benchmark.p75 });
  if (benchmark.p90 != null) points.push({ percentile: 90, value: benchmark.p90 });
  return Math.round(interpolatePercentile(value, points, direction));
}

export function benchmarkComparisonLabel(percentile: number): string {
  if (percentile >= 75) return "Above benchmark";
  if (percentile >= 40) return "Near benchmark";
  return "Below benchmark";
}
