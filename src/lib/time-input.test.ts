import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatMinuteSecond,
  parseDurationInput,
  usesMinuteSecondDisplay,
} from "./time-input";

describe("time-input", () => {
  it("detects Field Killer style timed KPIs", () => {
    assert.equal(
      usesMinuteSecondDisplay("seconds", "school-abc-field-killer", "Field Killer"),
      true
    );
  });

  it("parses m:ss to total seconds", () => {
    assert.equal(parseDurationInput("2:55"), 175);
    assert.equal(parseDurationInput("3:05"), 185);
  });

  it("formats seconds as m:ss", () => {
    assert.equal(formatMinuteSecond(175), "2:55");
    assert.equal(formatMinuteSecond(185), "3:05");
  });
});
