import { calculatePercentile } from "./benchmarks";
import type { ScoringDirection } from "@/lib/constants";

export type CategoryScore = {
  categorySlug: string;
  categoryName: string;
  score: number;
};

/**
 * Normalizes latest activity percentiles into category scores (0–100).
 */
export function calculateCategoryScores(
  items: {
    categorySlug: string;
    categoryName: string;
    value: number;
    benchmark: { p25?: number | null; p50: number; p75?: number | null; p90?: number | null };
    direction: ScoringDirection;
  }[]
): CategoryScore[] {
  const byCat = new Map<string, { name: string; scores: number[] }>();
  for (const item of items) {
    const p = calculatePercentile(item.value, item.benchmark, item.direction);
    const entry = byCat.get(item.categorySlug) ?? {
      name: item.categoryName,
      scores: [],
    };
    entry.scores.push(p);
    byCat.set(item.categorySlug, entry);
  }
  return Array.from(byCat.entries()).map(([slug, { name, scores }]) => ({
    categorySlug: slug,
    categoryName: name,
    score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
  }));
}
