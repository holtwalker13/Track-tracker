import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { semesterLabel, semesterSortKey } from "./pe-fitness-metrics";

describe("semesterLabel", () => {
  it("labels Fall, Spring, and Summer by UTC month", () => {
    assert.equal(semesterLabel(new Date("2025-10-01T12:00:00Z")), "Fall 2025");
    assert.equal(semesterLabel(new Date("2026-03-18T12:00:00Z")), "Spring 2026");
    assert.equal(semesterLabel(new Date("2026-07-04T12:00:00Z")), "Summer 2026");
  });
});

describe("semesterSortKey", () => {
  it("orders Fall before Spring within a year", () => {
    assert.ok(
      semesterSortKey("Fall 2025") < semesterSortKey("Spring 2026")
    );
    assert.ok(semesterSortKey("Spring 2026") < semesterSortKey("Fall 2026"));
  });
});
