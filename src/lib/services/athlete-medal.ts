import {
  KPI_METRIC_META,
  kpiBandsForGender,
  meetsTarget,
  type BandEvaluation,
  type KpiBand,
  type KpiMark,
  type KpiMetricSlug,
  type Medal,
  type SprintPotential,
} from "@/lib/kpi-targets";
import type { ScoringDirection } from "@/lib/constants";

export type AthleteMedalResult = {
  earnedMedal: Medal | null;
  nextMedal: Medal | null;
  rankedKPIs: KpiMetricSlug[];
  progressCount: number;
  totalRequirements: number;
  /** Full evaluation payload for UI (Medal standard, compare). */
  potential: SprintPotential;
};

const MEDAL_ORDER_EARNED: Medal[] = ["gold", "silver", "bronze"];
const MEDAL_ORDER_TARGET: Medal[] = ["bronze", "silver", "gold"];

function rankedSlugsFromBands(bands: KpiBand[]): KpiMetricSlug[] {
  const band = bands[0];
  if (!band) return KPI_METRIC_META.map((m) => m.slug);
  return KPI_METRIC_META.filter((m) => m.slug in band.targets && band.targets[m.slug] != null).map(
    (m) => m.slug
  );
}

function metricMetaForSlug(
  slug: string,
  overrides?: Map<string, { name: string; direction: ScoringDirection }>
): {
  name: string;
  direction: ScoringDirection;
} {
  const override = overrides?.get(slug);
  if (override) return override;
  const meta = KPI_METRIC_META.find((m) => m.slug === slug);
  if (meta) return { name: meta.name, direction: meta.direction };
  return {
    name: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    direction: "HIGHER_BETTER",
  };
}

function evaluateBandAllRequired(
  band: KpiBand,
  marksBySlug: Map<string, number>,
  rankedSlugs: string[],
  metricOverrides?: Map<string, { name: string; direction: ScoringDirection }>
): BandEvaluation {
  const rows = rankedSlugs.map((slug) => {
    const meta = metricMetaForSlug(slug, metricOverrides);
    const athlete = marksBySlug.get(slug) ?? null;
    const target = band.targets[slug as KpiMetricSlug];
    const hit =
      athlete == null || target == null
        ? null
        : meetsTarget(athlete, target, meta.direction);
    return {
      slug,
      name: meta.name,
      athlete,
      target: target ?? null,
      hit,
      direction: meta.direction,
    };
  });

  const totalRequirements = rankedSlugs.length;
  const hits = rows.filter((r) => r.hit === true).length;
  const tested = rows.filter((r) => r.hit != null).length;

  return {
    band,
    hits,
    tested,
    hitRate: totalRequirements === 0 ? 0 : hits / totalRequirements,
    rows,
  };
}

/**
 * Authoritative medal progress: every ranked KPI must meet the target to earn a level.
 * The active target is the lowest (bronze → silver → gold) medal not yet fully earned.
 */
export function calculateAthleteMedal(
  marks: KpiMark[],
  gender?: string | null,
  customBands?: KpiBand[],
  rankedSlugs?: string[],
  metricMetaBySlug?: Map<string, { name: string; direction: ScoringDirection }>
): AthleteMedalResult {
  const g: "F" | "M" = gender === "M" ? "M" : "F";
  const source = customBands?.length ? customBands : kpiBandsForGender(g);
  const slugs =
    rankedSlugs && rankedSlugs.length > 0
      ? [...rankedSlugs]
      : rankedSlugsFromBands(source);

  const marksBySlug = new Map(marks.map((m) => [m.slug, m.value]));
  const evaluations = source.map((band) =>
    evaluateBandAllRequired(band, marksBySlug, slugs, metricMetaBySlug)
  );

  let earnedMedal: Medal | null = null;
  for (const medal of MEDAL_ORDER_EARNED) {
    const ev = evaluations.find((e) => e.band.medal === medal);
    if (ev && slugs.length > 0 && ev.hits === slugs.length) {
      earnedMedal = medal;
      break;
    }
  }

  let nextMedal: Medal | null = null;
  let progressCount = 0;
  let totalRequirements = slugs.length;

  for (const medal of MEDAL_ORDER_TARGET) {
    const ev = evaluations.find((e) => e.band.medal === medal);
    if (!ev || slugs.length === 0) continue;
    if (ev.hits < slugs.length) {
      nextMedal = medal;
      progressCount = ev.hits;
      totalRequirements = slugs.length;
      break;
    }
  }

  const matched =
    earnedMedal != null
      ? evaluations.find((e) => e.band.medal === earnedMedal) ?? null
      : null;

  const next =
    nextMedal != null ? evaluations.find((e) => e.band.medal === nextMedal) ?? null : null;

  return {
    earnedMedal,
    nextMedal,
    rankedKPIs: slugs as KpiMetricSlug[],
    progressCount,
    totalRequirements,
    potential: {
      gender: g,
      matched,
      next,
      bands: evaluations,
    },
  };
}
