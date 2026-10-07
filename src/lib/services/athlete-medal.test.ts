import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateAthleteMedal } from "./athlete-medal";
import { kpiBandsForGender, type KpiMetricSlug } from "@/lib/kpi-targets";

describe("calculateAthleteMedal", () => {
  const ranked: KpiMetricSlug[] = [
    "vertical-jump",
    "standing-broad-jump",
    "flying-10-meter",
    "40-yard-dash",
  ];

  it("does not award bronze until all ranked KPIs meet bronze targets", () => {
    const bands = kpiBandsForGender("M");
    const bronze = bands.find((b) => b.medal === "bronze")!;
    const marks = ranked.slice(0, 3).map((slug) => ({
      slug,
      value: bronze.targets[slug],
    }));

    const result = calculateAthleteMedal(marks, "M", bands, ranked);
    assert.equal(result.earnedMedal, null);
    assert.equal(result.nextMedal, "bronze");
    assert.equal(result.progressCount, 3);
    assert.equal(result.totalRequirements, 4);
  });

  it("awards bronze when every ranked KPI meets bronze", () => {
    const bands = kpiBandsForGender("M");
    const bronze = bands.find((b) => b.medal === "bronze")!;
    const marks = ranked.map((slug) => ({ slug, value: bronze.targets[slug] }));

    const result = calculateAthleteMedal(marks, "M", bands, ranked);
    assert.equal(result.earnedMedal, "bronze");
    assert.equal(result.nextMedal, "silver");
  });

  it("keeps bronze as target when bronze is incomplete even if some KPIs exceed silver", () => {
    const bands = kpiBandsForGender("M");
    const bronze = bands.find((b) => b.medal === "bronze")!;
    const silver = bands.find((b) => b.medal === "silver")!;

    const marks = [
      ...ranked.slice(0, 2).map((slug) => ({ slug, value: silver.targets[slug] })),
      { slug: ranked[2]!, value: bronze.targets[ranked[2]!] },
      // Fourth ranked KPI missing — bronze cannot be earned
    ];

    const result = calculateAthleteMedal(marks, "M", bands, ranked);
    assert.equal(result.earnedMedal, null);
    assert.equal(result.nextMedal, "bronze");
    assert.equal(result.progressCount, 3);
  });

  it("treats ranked KPIs without a coach-set target as unconfigured (null target, no hit)", () => {
    // Exact KPI-tab bands: only vertical-jump has a bronze target; every other
    // ranked KPI has no target and must not fall back to hardcoded defaults.
    const bands = ["gold", "silver", "bronze"].map((medal) => ({
      id: `M-${medal}`,
      gender: "M" as const,
      medal: medal as "gold" | "silver" | "bronze",
      label: `Boys ${medal}`,
      targets: { "vertical-jump": 24 } as Record<KpiMetricSlug, number>,
    }));

    const marks = ranked.map((slug) => ({ slug, value: 999 }));

    const result = calculateAthleteMedal(marks, "M", bands, ranked);
    // Only the targeted KPI can hit; medal stays unearned.
    assert.equal(result.earnedMedal, null);
    assert.equal(result.nextMedal, "bronze");
    const bronzeEval = result.potential.bands.find((b) => b.band.medal === "bronze")!;
    const vj = bronzeEval.rows.find((r) => r.slug === "vertical-jump")!;
    assert.equal(vj.target, 24);
    assert.equal(vj.hit, true);
    const fly = bronzeEval.rows.find((r) => r.slug === "flying-10-meter")!;
    assert.equal(fly.target, null);
    assert.equal(fly.hit, null);
  });

  it("treats flying-10-yard as lower-is-better when activity scoring is wired in", () => {
    const bands = kpiBandsForGender("F").map((band) => ({
      ...band,
      targets: {
        ...band.targets,
        "flying-10-yard": band.targets["flying-10-meter"],
      },
    }));
    const bronze = bands.find((b) => b.medal === "bronze")!;
    const metricMeta = new Map([
      ["flying-10-yard", { name: "Flying 10 yd", direction: "LOWER_BETTER" as const }],
    ]);
    const marks = [{ slug: "flying-10-yard" as const, value: 1.21 }];
    const result = calculateAthleteMedal(marks, "F", bands, ["flying-10-yard"], metricMeta);
    assert.equal(result.earnedMedal, "bronze");
    const bronzeEval = result.potential.bands.find((b) => b.band.medal === "bronze")!;
    const fly = bronzeEval.rows.find((r) => r.slug === "flying-10-yard")!;
    assert.equal(fly.hit, true);
    assert.equal(fly.target, bronze.targets["flying-10-yard"]);
  });

  it("does not fall back to catalog KPIs when rankedSlugs is an empty list", () => {
    const bands = kpiBandsForGender("F");
    const result = calculateAthleteMedal([], "F", bands, []);
    assert.equal(result.rankedKPIs.length, 0);
    assert.equal(result.nextMedal, null);
    assert.equal(result.potential.next, null);
  });

  it("shows an empty evaluation when the governing set ranks nothing", () => {
    const bands = ["gold", "silver", "bronze"].map((medal) => ({
      id: `M-${medal}`,
      gender: "M" as const,
      medal: medal as "gold" | "silver" | "bronze",
      label: `Boys ${medal}`,
      targets: {} as Record<KpiMetricSlug, number>,
    }));

    const result = calculateAthleteMedal([], "M", bands, []);
    assert.equal(result.earnedMedal, null);
    assert.equal(result.nextMedal, null);
    assert.equal(result.potential.bands.every((b) => b.rows.length === 0), true);
  });
});
