import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bestSetLabel,
  compareLiftMark,
  dayLiftValue,
  rankImprovements,
} from "@/lib/queries/workout-day-review";
import { coachFacingWorkoutStatus } from "@/lib/services/workouts";

describe("coachFacingWorkoutStatus", () => {
  it("treats a scheduled session with no sets as not started", () => {
    assert.equal(coachFacingWorkoutStatus("IN_PROGRESS", 0), "NOT_STARTED");
    assert.equal(coachFacingWorkoutStatus("IN_PROGRESS", 3), "IN_PROGRESS");
    assert.equal(coachFacingWorkoutStatus("COMPLETED", 0), "COMPLETED");
  });
});

describe("day workout review", () => {
  it("projects the best Epley mark and names that set", () => {
    const sets = [
      { setNumber: 1, weightLb: 135, reps: 5, skipped: false },
      { setNumber: 2, weightLb: 155, reps: 3, skipped: false },
    ];
    assert.equal(dayLiftValue("lb", sets), Math.round(155 * (1 + 3 / 30) * 10) / 10);
    assert.equal(bestSetLabel("lb", sets), "155×3");
  });

  it("marks a higher projection as improved and a first log as new", () => {
    const improved = compareLiftMark(150, 140);
    assert.equal(improved.improved, true);
    assert.equal(improved.delta, 10);
    const first = compareLiftMark(150, null);
    assert.equal(first.isFirst, true);
    assert.equal(first.improved, false);
    assert.equal(compareLiftMark(null, 140).improved, false);
  });

  it("stands out only the largest gain when others improved less", () => {
    const ranked = rankImprovements([
      { studentId: "a", name: "Ada", delta: 4 },
      { studentId: "b", name: "Bea", delta: 18 },
      { studentId: "c", name: "Cia", delta: 18 },
    ]);
    assert.deepEqual(
      ranked.map((row) => [row.name, row.standout]),
      [
        ["Bea", true],
        ["Cia", true],
        ["Ada", false],
      ]
    );
  });
});
