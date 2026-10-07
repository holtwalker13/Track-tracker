import type { ScoringDirection } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { KPI_METRIC_META, type KpiMark } from "@/lib/kpi-targets";

/** Same test recorded under different catalog slugs — share one best mark for medals. */
export const KPI_MARK_ALIAS_GROUPS: readonly string[][] = [
  ["flying-10-meter", "flying-10-yard"],
];

const aliasGroupBySlug = new Map<string, string[]>();
for (const group of KPI_MARK_ALIAS_GROUPS) {
  for (const slug of group) {
    aliasGroupBySlug.set(slug, [...group]);
  }
}

export function markAliasSlugsFor(slug: string): string[] {
  return aliasGroupBySlug.get(slug) ?? [slug];
}

export function expandSlugsWithMarkAliases(slugs: string[]): string[] {
  const out = new Set<string>();
  for (const slug of slugs) {
    for (const s of markAliasSlugsFor(slug)) out.add(s);
  }
  return [...out];
}

/**
 * Map a ranked KPI slug from the KPI set to catalog slugs that may hold marks
 * (handles school-specific activity slugs that differ from the set metric slug).
 */
export async function resolveRankedSlugToActivitySlugs(
  schoolId: string,
  rankedSlug: string
): Promise<string[]> {
  const candidates = new Set(markAliasSlugsFor(rankedSlug));
  const direct = await prisma.activity.findMany({
    where: {
      slug: { in: [...candidates] },
      OR: [{ schoolId: null }, { schoolId }],
    },
    select: { slug: true },
  });
  if (direct.length > 0) return direct.map((a) => a.slug);

  const label = metricDisplayName(rankedSlug);
  const byName = await prisma.activity.findMany({
    where: {
      OR: [{ schoolId: null }, { schoolId }],
      name: { equals: label, mode: "insensitive" },
    },
    select: { slug: true },
  });
  if (byName.length > 0) return byName.map((a) => a.slug);

  return [rankedSlug];
}

export async function expandRankedSlugsToQuerySlugs(
  schoolId: string,
  rankedSlugs: string[]
): Promise<string[]> {
  const out = new Set<string>();
  for (const slug of rankedSlugs) {
    for (const s of await resolveRankedSlugToActivitySlugs(schoolId, slug)) {
      out.add(s);
    }
  }
  return [...out];
}

export type ActivityScoringRow = {
  slug: string;
  name: string;
  scoringDirection: ScoringDirection;
};

export function catalogMetricDirection(slug: string): ScoringDirection | null {
  const meta = KPI_METRIC_META.find((m) => m.slug === slug);
  return meta?.direction ?? null;
}

export function scoringDirectionForSlug(
  slug: string,
  activity?: Pick<ActivityScoringRow, "scoringDirection"> | null
): ScoringDirection {
  if (activity?.scoringDirection) return activity.scoringDirection;
  return catalogMetricDirection(slug) ?? "HIGHER_BETTER";
}

export function metricDisplayName(
  slug: string,
  activity?: Pick<ActivityScoringRow, "name"> | null
): string {
  if (activity?.name) return activity.name;
  const meta = KPI_METRIC_META.find((m) => m.slug === slug);
  if (meta) return meta.name;
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Build career-best marks per ranked KPI, merging alias slugs (e.g. fly 10 m / fly 10 yd).
 */
export function buildRankedKpiMarks(
  rankedSlugs: string[],
  rawBestBySlug: Map<string, number>,
  activitiesBySlug: Map<string, ActivityScoringRow>,
  querySlugToRanked?: Map<string, string>
): KpiMark[] {
  const marks: KpiMark[] = [];
  for (const rankedSlug of rankedSlugs) {
    const slugKeys = new Set(markAliasSlugsFor(rankedSlug));
    if (querySlugToRanked) {
      for (const [activitySlug, parent] of querySlugToRanked) {
        if (parent === rankedSlug) slugKeys.add(activitySlug);
      }
    }
    const direction = scoringDirectionForSlug(
      rankedSlug,
      activitiesBySlug.get(rankedSlug) ??
        [...slugKeys].map((s) => activitiesBySlug.get(s)).find(Boolean)
    );
    const lower = direction === "LOWER_BETTER";
    let best: number | null = null;
    for (const slug of slugKeys) {
      const value = rawBestBySlug.get(slug);
      if (value == null) continue;
      if (best == null || (lower ? value < best : value > best)) best = value;
    }
    if (best != null) {
      marks.push({ slug: rankedSlug as KpiMark["slug"], value: best });
    }
  }
  return marks;
}

export function metricMetaMapForRanked(
  rankedSlugs: string[],
  activitiesBySlug: Map<string, ActivityScoringRow>
): Map<string, { name: string; direction: ScoringDirection }> {
  const map = new Map<string, { name: string; direction: ScoringDirection }>();
  for (const slug of rankedSlugs) {
    const aliases = markAliasSlugsFor(slug);
    const activity =
      activitiesBySlug.get(slug) ??
      aliases.map((s) => activitiesBySlug.get(s)).find(Boolean);
    map.set(slug, {
      name: metricDisplayName(slug, activity),
      direction: scoringDirectionForSlug(slug, activity),
    });
  }
  return map;
}
