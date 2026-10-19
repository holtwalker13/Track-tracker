import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { medalClassPickerLines } from "./periods";

describe("medalClassPickerLines", () => {
  it("splits semester term from period and class name", () => {
    const lines = medalClassPickerLines({
      name: "Spring 2026 Period 1 PE",
      period: "Spring 2026 Period 1",
    });
    assert.equal(lines.term, "Spring 2026");
    assert.equal(lines.detail, "Period 1 PE");
  });

  it("handles varsity-style class names", () => {
    const lines = medalClassPickerLines({
      name: "Fall 2025 Period 5 Varsity Weights",
      period: "Fall 2025 Period 5",
    });
    assert.equal(lines.term, "Fall 2025");
    assert.equal(lines.detail, "Period 5 Varsity Weights");
  });
});
