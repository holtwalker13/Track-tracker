import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sendTestLoginCodeEmail } from "@/lib/email/send-test-login-code";

describe("sendTestLoginCodeEmail", () => {
  it("rejects invalid addresses", async () => {
    const result = await sendTestLoginCodeEmail({ to: "not-an-email" });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /valid email/i);
    }
  });
});
