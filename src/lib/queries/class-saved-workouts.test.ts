import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classSavedWorkoutWhere } from "@/lib/queries/class-saved-workouts";

describe("classSavedWorkoutWhere", () => {
  it("keeps class-tagged workouts and hides other classes' libraries", () => {
    const where = classSavedWorkoutWhere("school", "basketball", ["jake"]);
    assert.equal(where.schoolId, "school");
    assert.equal(where.archivedAt, null);
    const or = where.OR as unknown[];
    assert.equal(or.length, 3);
    assert.deepEqual(or[0], { classId: "basketball" });
    assert.deepEqual(or[1], { assignments: { some: { classId: "basketball" } } });
  });
});
