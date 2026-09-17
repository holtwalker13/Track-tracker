/**
 * School medal targets (Gold / Silver / Bronze) per KPI metric.
 * Defaults come from the JHS Athletics key; each school can override them.
 */

export type KpiMetricSlug =
  | "flying-10-meter"
  | "standing-broad-jump"
  | "vertical-jump"
  | "squat-relative"
  | "hang-clean-relative"
  | "20-meter-start"
  | "40-yard-dash";

export type Medal = "gold" | "silver" | "bronze";

export const MEDALS: Medal[] = ["gold", "silver", "bronze"];

export const MEDAL_LABELS: Record<Medal, string> = {
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
};

export type KpiBand = {
  id: string;
  gender: "F" | "M";
  medal: Medal;
  label: string;
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
    id: "F-gold",
    gender: "F",
    medal: "gold",
    label: "Girls Gold",
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
    id: "F-silver",
    gender: "F",
    medal: "silver",
    label: "Girls Silver",
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
    id: "F-bronze",
    gender: "F",
    medal: "bronze",
    label: "Girls Bronze",
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

export const MALE_KPI_BANDS: KpiBand[] = [
  {
    id: "M-gold",
    gender: "M",
    medal: "gold",
    label: "Boys Gold",
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
    id: "M-silver",
    gender: "M",
    medal: "silver",
    label: "Boys Silver",
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
    id: "M-bronze",
    gender: "M",
    medal: "bronze",
    label: "Boys Bronze",
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
  return bands.find((b) => b.medal === "silver") ?? bands[1]!;
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

export function bandsFromTargets(
  gender: "F" | "M",
  byMedal: Record<Medal, Record<KpiMetricSlug, number>>
): KpiBand[] {
  return MEDALS.map((medal) => {
    const fallback = kpiBandsForGender(gender).find((b) => b.medal === medal)!;
    return {
      id: `${gender}-${medal}`,
      gender,
      medal,
      label: gender === "M" ? `Boys ${MEDAL_LABELS[medal]}` : `Girls ${MEDAL_LABELS[medal]}`,
      targets: { ...fallback.targets, ...byMedal[medal] },
    };
  });
}

export function evaluateSprintPotential(
  marks: KpiMark[],
  gender?: string | null,
  customBands?: KpiBand[]
): SprintPotential {
  const g: "F" | "M" = gender === "M" ? "M" : "F";
  const bySlug = new Map(marks.map((m) => [m.slug, m.value]));
  const source = customBands?.length ? customBands : kpiBandsForGender(g);
  const bands = source.map((band) => {
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

  // Gold first. Match the best medal whose hit rate is at least 50% with 2+ KPIs tested.
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
