import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isUnder13 } from "@/lib/auth/tenant-access";

describe("tenant-access", () => {
  it("detects students under 13 by date of birth", () => {
    const today = new Date("2026-10-16T12:00:00Z");
    assert.equal(isUnder13(new Date("2015-01-01"), today), true);
    assert.equal(isUnder13(new Date("2010-01-01"), today), false);
  });
});
