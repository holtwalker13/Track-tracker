import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  percentThatHoldsCurrent1Rm,
  projectionChangePercent,
} from "@/lib/workout-prescriptions";

describe("1RM prescription hints", () => {
  it("uses the Epley percent that holds the current 1RM", () => {
    assert.equal(percentThatHoldsCurrent1Rm(1), 100);
    const six = percentThatHoldsCurrent1Rm(6);
    assert.ok(six != null);
    assert.ok(Math.abs(six - 100 / 1.2) < 0.001);
  });

  it("reports how far a higher percent lifts the projection", () => {
    const delta = projectionChangePercent(6, 90);
    assert.ok(delta != null);
    assert.ok(Math.abs(delta - 8) < 0.001);
  });
});
