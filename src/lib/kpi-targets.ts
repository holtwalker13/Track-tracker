/**
 * JHS Athletics KPI key: hitting these marks is associated with a 100m / 40-yard time.
 *
 * Female 13.0s Flying 10m is stored as 1.188s. The source sheet listed 1.879s for that
 * cell, which is slower than the 13.5s target (1.226s) and is treated as a typo;
 * 1.188s is the midpoint between the 12.5s and 13.5s flying-10m targets.
 *
 * Male bands are synthetic analogs (no boy KPI sheet was provided).
 */

export type KpiMetricSlug =
  | "flying-10-meter"
  | "standing-broad-jump"
  | "vertical-jump"
  | "squat-relative"
  | "hang-clean-relative"
  | "20-meter-start"
  | "40-yard-dash";

export type KpiBand = {
  id: string;
  gender: "F" | "M";
  label: string;
  hundredMeter: number;
  fortyYard: number;
  /** Target value per KPI metric (seconds, inches, or × bodyweight). */
  targets: Record<KpiMetricSlug, number>;
};

export const KPI_METRIC_META: {
  slug: KpiMetricSlug;
  name: string;
  unit: string;
  direction: "HIGHER_BETTER" | "LOWER_BETTER";
}[] = [
  { slug: "flying-10-meter", name: "Flying 10 m", unit: "seconds", direction: "LOWER_BETTER" },
  { slug: "standing-broad-jump", name: "Standing Broad Jump", unit: "inches", direction: "HIGHER_BETTER" },
  { slug: "vertical-jump", name: "Vertical Jump (CMJ)", unit: "inches", direction: "HIGHER_BETTER" },
  { slug: "squat-relative", name: "Back Squat 1RM / BW", unit: "x BW", direction: "HIGHER_BETTER" },
  { slug: "hang-clean-relative", name: "Hang Clean 1RM / BW", unit: "x BW", direction: "HIGHER_BETTER" },
  { slug: "20-meter-start", name: "20 m start (blocks)", unit: "seconds", direction: "LOWER_BETTER" },
  { slug: "40-yard-dash", name: "40 Yard Dash", unit: "seconds", direction: "LOWER_BETTER" },
];

export const FEMALE_KPI_BANDS: KpiBand[] = [
  {
    id: "F-12.5",
    gender: "F",
    label: "Female — 12.5s 100m",
    hundredMeter: 12.5,
    fortyYard: 5.22,
    targets: {
      "flying-10-meter": 1.151,
      "standing-broad-jump": 94,
      "vertical-jump": 24,
      "squat-relative": 2.0,
      "hang-clean-relative": 1.3,
      "20-meter-start": 3.33,
      "40-yard-dash": 5.22,
    },
  },
  {
    id: "F-13.0",
    gender: "F",
    label: "Female — 13.0s 100m",
    hundredMeter: 13.0,
    fortyYard: 5.44,
    targets: {
      "flying-10-meter": 1.188,
      "standing-broad-jump": 87,
      "vertical-jump": 21.5,
      "squat-relative": 1.8,
      "hang-clean-relative": 1.2,
      "20-meter-start": 3.48,
      "40-yard-dash": 5.44,
    },
  },
  {
    id: "F-13.5",
    gender: "F",
    label: "Female — 13.5s 100m",
    hundredMeter: 13.5,
    fortyYard: 5.64,
    targets: {
      "flying-10-meter": 1.226,
      "standing-broad-jump": 81,
      "vertical-jump": 19.5,
      "squat-relative": 1.6,
      "hang-clean-relative": 1.1,
      "20-meter-start": 3.62,
      "40-yard-dash": 5.64,
    },
  },
];

/** Synthetic male analog of the female KPI key (similar structure, faster/stronger targets). */
export const MALE_KPI_BANDS: KpiBand[] = [
  {
    id: "M-11.0",
    gender: "M",
    label: "Male — 11.0s 100m",
    hundredMeter: 11.0,
    fortyYard: 4.55,
    targets: {
      "flying-10-meter": 1.047,
      "standing-broad-jump": 111,
      "vertical-jump": 30,
      "squat-relative": 2.2,
      "hang-clean-relative": 1.45,
      "20-meter-start": 3.03,
      "40-yard-dash": 4.55,
    },
  },
  {
    id: "M-11.5",
    gender: "M",
    label: "Male — 11.5s 100m",
    hundredMeter: 11.5,
    fortyYard: 4.75,
    targets: {
      "flying-10-meter": 1.081,
      "standing-broad-jump": 103,
      "vertical-jump": 27,
      "squat-relative": 2.0,
      "hang-clean-relative": 1.3,
      "20-meter-start": 3.17,
      "40-yard-dash": 4.75,
    },
  },
  {
    id: "M-12.0",
    gender: "M",
    label: "Male — 12.0s 100m",
    hundredMeter: 12.0,
    fortyYard: 4.95,
    targets: {
      "flying-10-meter": 1.116,
      "standing-broad-jump": 96,
      "vertical-jump": 24.5,
      "squat-relative": 1.8,
      "hang-clean-relative": 1.2,
      "20-meter-start": 3.29,
      "40-yard-dash": 4.95,
    },
  },
];

export const ALL_KPI_BANDS = [...FEMALE_KPI_BANDS, ...MALE_KPI_BANDS];

export function kpiBandsForGender(gender?: string | null): KpiBand[] {
  return gender === "M" ? MALE_KPI_BANDS : FEMALE_KPI_BANDS;
}

export function midKpiBand(gender?: string | null): KpiBand {
  const bands = kpiBandsForGender(gender);
  return bands[1]!;
}

export function meetsTarget(
  value: number,
  target: number,
  direction: "HIGHER_BETTER" | "LOWER_BETTER"
): boolean {
  return direction === "HIGHER_BETTER" ? value >= target : value <= target;
}

export type KpiMark = { slug: KpiMetricSlug; value: number };

export type BandEvaluation = {
  band: KpiBand;
  hits: number;
  tested: number;
  hitRate: number;
  rows: {
    slug: KpiMetricSlug;
    name: string;
    athlete: number | null;
    target: number;
    hit: boolean | null;
    direction: "HIGHER_BETTER" | "LOWER_BETTER";
  }[];
};

export type SprintPotential = {
  gender: "F" | "M";
  matched: BandEvaluation | null;
  next: BandEvaluation | null;
  bands: BandEvaluation[];
};

export function evaluateSprintPotential(
  marks: KpiMark[],
  gender?: string | null
): SprintPotential {
  const g: "F" | "M" = gender === "M" ? "M" : "F";
  const bySlug = new Map(marks.map((m) => [m.slug, m.value]));
  const bands = kpiBandsForGender(g).map((band) => {
    const rows = KPI_METRIC_META.map((meta) => {
      const athlete = bySlug.get(meta.slug) ?? null;
      const target = band.targets[meta.slug];
      const hit = athlete == null ? null : meetsTarget(athlete, target, meta.direction);
      return {
        slug: meta.slug,
        name: meta.name,
        athlete,
        target,
        hit,
        direction: meta.direction,
      };
    });
    const tested = rows.filter((r) => r.hit != null).length;
    const hits = rows.filter((r) => r.hit === true).length;
    return {
      band,
      hits,
      tested,
      hitRate: tested === 0 ? 0 : hits / tested,
      rows,
    };
  });

  // Fastest (lowest 100m) band first in FEMALE/MALE arrays.
  // Match the fastest band whose hit rate is at least 50% with 2+ KPIs tested.
  let matched: BandEvaluation | null = null;
  for (const ev of bands) {
    if (ev.tested >= 2 && ev.hitRate >= 0.5) {
      matched = ev;
      break;
    }
  }
  if (!matched) {
    matched = [...bands].reverse().find((ev) => ev.tested > 0) ?? null;
  }

  const matchedIndex = matched ? bands.indexOf(matched) : -1;
  const next = matchedIndex > 0 ? bands[matchedIndex - 1]! : null;

  return { gender: g, matched, next, bands };
}
