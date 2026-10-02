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
});
