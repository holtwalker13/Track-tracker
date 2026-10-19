import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classMatchesCoachFilter } from "@/lib/classes/coach-filter";

describe("classMatchesCoachFilter", () => {
  it("shows all when filter is all or empty", () => {
    assert.equal(classMatchesCoachFilter(["c1"], undefined), true);
    assert.equal(classMatchesCoachFilter([], "all"), true);
  });

  it("matches unassigned classes", () => {
    assert.equal(classMatchesCoachFilter([], "unassigned"), true);
    assert.equal(classMatchesCoachFilter(["c1"], "unassigned"), false);
  });

  it("matches assigned coach id", () => {
    assert.equal(classMatchesCoachFilter(["c1", "c2"], "c2"), true);
    assert.equal(classMatchesCoachFilter(["c1"], "c2"), false);
  });
});
