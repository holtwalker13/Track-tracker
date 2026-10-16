import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkRateLimit } from "@/lib/security/rate-limit";

describe("rate-limit", () => {
  it("blocks after max attempts in window", () => {
    const key = `test-${Date.now()}`;
    assert.equal(checkRateLimit(key, 2, 60_000).allowed, true);
    assert.equal(checkRateLimit(key, 2, 60_000).allowed, true);
    const third = checkRateLimit(key, 2, 60_000);
    assert.equal(third.allowed, false);
    if (!third.allowed) assert.ok(third.retryAfterSec >= 1);
  });
});
