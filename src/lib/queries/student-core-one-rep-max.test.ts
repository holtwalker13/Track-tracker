import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickEffectiveOneRepMaxForWorkouts } from "@/lib/queries/student-core-one-rep-max";

describe("pickEffectiveOneRepMaxForWorkouts", () => {
  it("uses a tested mark when present", () => {
    assert.deepEqual(pickEffectiveOneRepMaxForWorkouts(225, 200), {
      value: 225,
      source: "tested",
    });
  });

  it("falls back to the coach core starting point", () => {
    assert.deepEqual(pickEffectiveOneRepMaxForWorkouts(null, 185), {
      value: 185,
      source: "core",
    });
  });

  it("returns null when neither is set", () => {
    assert.deepEqual(pickEffectiveOneRepMaxForWorkouts(null, null), {
      value: null,
      source: null,
    });
  });
});
