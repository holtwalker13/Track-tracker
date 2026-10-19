import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveDistrictReportMetricSlugs } from "./admin-coach-performance";

describe("resolveDistrictReportMetricSlugs", () => {
  const catalog = ["sit-and-reach", "pull-ups", "mile-run", "vertical-jump"];

  it("defaults to PE metrics when param is empty", () => {
    const slugs = resolveDistrictReportMetricSlugs(undefined, catalog);
    assert.deepEqual(slugs, ["sit-and-reach", "pull-ups", "mile-run"]);
  });

  it("uses comma-separated slugs from the URL", () => {
    const slugs = resolveDistrictReportMetricSlugs("vertical-jump,pull-ups", catalog);
    assert.deepEqual(slugs, ["vertical-jump", "pull-ups"]);
  });

  it("ignores unknown slugs", () => {
    const slugs = resolveDistrictReportMetricSlugs("nope,vertical-jump", catalog);
    assert.deepEqual(slugs, ["vertical-jump"]);
  });
});
