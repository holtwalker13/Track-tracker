import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveWorkoutPerformanceValue } from "./workout-performance-sync";

describe("deriveWorkoutPerformanceValue", () => {
  it("uses max reps for rep events", () => {
    const value = deriveWorkoutPerformanceValue(
      { slug: "pull-ups", unit: "reps" },
      [
        { weightLb: null, reps: 8, skipped: false },
        { weightLb: null, reps: 12, skipped: false },
        { weightLb: null, reps: 10, skipped: true },
      ]
    );
    assert.equal(value, 12);
  });

  it("uses best e1RM for lb lifts", () => {
    const value = deriveWorkoutPerformanceValue(
      { slug: "squat", unit: "lb" },
      [
        { weightLb: 200, reps: 5, skipped: false },
        { weightLb: 225, reps: 3, skipped: false },
      ]
    );
    assert.ok(value != null && value > 225);
  });
});
