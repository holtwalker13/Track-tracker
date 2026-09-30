import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { weekKeyForDate, assignmentsInWeek } from "@/lib/gamification/assignments";
import { gamificationSourceKeys } from "@/lib/gamification/source-keys";
import {
  currentWorkoutStreak,
  longestWorkoutStreak,
  type AssignmentCompletionRow,
} from "@/lib/gamification/streaks";
import { levelFromLifetimeXp, levelProgress, XP_PER_LEVEL } from "@/lib/gamification/xp";

function row(date: string, completed: boolean, id = date): AssignmentCompletionRow {
  return {
    assignmentId: id,
    scheduledDate: new Date(`${date}T12:00:00.000Z`),
    completed,
  };
}

describe("levelProgress", () => {
  it("uses 1,000 XP per level", () => {
    assert.equal(XP_PER_LEVEL, 1000);
    assert.deepEqual(levelProgress(840 + 11 * 1000), {
      level: 12,
      xpIntoLevel: 840,
      xpForNextLevel: 1000,
    });
    assert.equal(levelFromLifetimeXp(0), 1);
  });
});

describe("workout streaks", () => {
  it("counts consecutive completed assignments from most recent backward", () => {
    const rows = [
      row("2025-09-01", true),
      row("2025-09-03", true),
      row("2025-09-05", true),
      row("2025-09-08", true),
    ];
    assert.equal(currentWorkoutStreak(rows), 4);
    assert.equal(longestWorkoutStreak(rows), 4);
  });

  it("does not break streak on gaps without assignments", () => {
    const rows = [
      row("2025-09-01", true),
      row("2025-09-08", true),
      row("2025-09-15", true),
    ];
    assert.equal(currentWorkoutStreak(rows), 3);
    assert.equal(longestWorkoutStreak(rows), 3);
  });
});

describe("perfect week keys", () => {
  it("groups assignments by Monday week", () => {
    const mon = new Date("2025-09-29T12:00:00.000Z");
    const wed = new Date("2025-10-01T12:00:00.000Z");
    assert.equal(weekKeyForDate(mon), weekKeyForDate(wed));
    const rows = [row("2025-09-29", true, "a"), row("2025-10-01", false, "b")];
    const inWeek = assignmentsInWeek(rows, weekKeyForDate(mon));
    assert.equal(inWeek.length, 2);
  });
});

describe("duplicate XP prevention keys", () => {
  it("uses stable per-session keys", () => {
    const sessionId = "sess_abc";
    const a = gamificationSourceKeys.workoutComplete(sessionId);
    const b = gamificationSourceKeys.workoutComplete(sessionId);
    assert.equal(a, b);
    assert.notEqual(
      gamificationSourceKeys.workoutComplete(sessionId),
      gamificationSourceKeys.allSets(sessionId)
    );
  });

  it("separates PR and lift-improved keys per activity", () => {
    assert.notEqual(
      gamificationSourceKeys.pr("s1", "act1"),
      gamificationSourceKeys.liftImproved("s1", "act1")
    );
  });
});
