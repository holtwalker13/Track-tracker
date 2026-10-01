import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calendarDateAtNoonUtc,
  toCalendarDateString,
  todayCalendarDateString,
} from "./calendar-date";

describe("calendarDateAtNoonUtc", () => {
  it("parses YYYY-MM-DD at noon UTC", () => {
    const d = calendarDateAtNoonUtc("2026-03-15");
    assert.ok(d);
    assert.equal(d.toISOString(), "2026-03-15T12:00:00.000Z");
    assert.equal(toCalendarDateString(d), "2026-03-15");
  });

  it("rejects invalid dates", () => {
    assert.equal(calendarDateAtNoonUtc(""), null);
    assert.equal(calendarDateAtNoonUtc("03/15/2026"), null);
    assert.equal(calendarDateAtNoonUtc("2026-02-31"), null);
  });

  it("todayCalendarDateString is YYYY-MM-DD", () => {
    assert.match(todayCalendarDateString(), /^\d{4}-\d{2}-\d{2}$/);
  });
});
