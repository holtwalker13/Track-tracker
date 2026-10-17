import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateLoginCode } from "@/lib/auth/email-login-code";

describe("generateLoginCode", () => {
  it("returns a 6-digit code", () => {
    for (let i = 0; i < 20; i++) {
      assert.match(generateLoginCode(), /^\d{6}$/);
    }
  });
});
