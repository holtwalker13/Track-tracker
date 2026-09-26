import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateImprovement,
  calculatePersonalRecord,
  pickBestAttempt,
} from "./performance";

describe("calculatePersonalRecord", () => {
  it("treats first mark as PR when no previous best", () => {
    assert.equal(calculatePersonalRecord(42, null, "HIGHER_BETTER"), true);
  });

  it("respects HIGHER_BETTER", () => {
    assert.equal(calculatePersonalRecord(41, 40, "HIGHER_BETTER"), true);
    assert.equal(calculatePersonalRecord(39, 40, "HIGHER_BETTER"), false);
    assert.equal(calculatePersonalRecord(40, 40, "HIGHER_BETTER"), false);
  });

  it("respects LOWER_BETTER", () => {
    assert.equal(calculatePersonalRecord(12.1, 12.5, "LOWER_BETTER"), true);
    assert.equal(calculatePersonalRecord(12.6, 12.5, "LOWER_BETTER"), false);
  });
});

describe("pickBestAttempt", () => {
  it("picks max for HIGHER_BETTER", () => {
    assert.equal(pickBestAttempt([10, 22, 18], "HIGHER_BETTER"), 22);
  });

  it("picks min for LOWER_BETTER", () => {
    assert.equal(pickBestAttempt([12.5, 12.1, 12.3], "LOWER_BETTER"), 12.1);
  });

  it("returns null for empty input", () => {
    assert.equal(pickBestAttempt([], "HIGHER_BETTER"), null);
  });
});

describe("calculateImprovement", () => {
  it("computes higher-better percent change", () => {
    const { absolute, percent } = calculateImprovement(110, 100, "HIGHER_BETTER");
    assert.equal(absolute, 10);
    assert.equal(percent, 10);
  });

  it("computes lower-better improvement for times", () => {
    const { absolute, percent } = calculateImprovement(12.0, 12.5, "LOWER_BETTER");
    assert.equal(absolute, 0.5);
    assert.ok(percent != null && percent > 0);
  });
});
