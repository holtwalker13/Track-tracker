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

function evaluateBandAllRequired(
  band: KpiBand,
  marksBySlug: Map<KpiMetricSlug, number>,
  rankedSlugs: KpiMetricSlug[]
): BandEvaluation {
  const rows = rankedSlugs.map((slug) => {
    const meta = KPI_METRIC_META.find((m) => m.slug === slug)!;
    const athlete = marksBySlug.get(slug) ?? null;
    const target = band.targets[slug];
    const hit =
      athlete == null || target == null
        ? null
        : meetsTarget(athlete, target, meta.direction);
    return {
      slug,
      name: meta.name,
      athlete,
      target: target ?? 0,
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
  rankedSlugs?: string[]
): AthleteMedalResult {
  const g: "F" | "M" = gender === "M" ? "M" : "F";
  const source = customBands?.length ? customBands : kpiBandsForGender(g);
  const slugs =
    rankedSlugs && rankedSlugs.length > 0
      ? (rankedSlugs.filter((s) =>
          KPI_METRIC_META.some((m) => m.slug === s)
        ) as KpiMetricSlug[])
      : rankedSlugsFromBands(source);

  const marksBySlug = new Map(marks.map((m) => [m.slug, m.value]));
  const evaluations = source.map((band) =>
    evaluateBandAllRequired(band, marksBySlug, slugs)
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
    rankedKPIs: slugs,
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
