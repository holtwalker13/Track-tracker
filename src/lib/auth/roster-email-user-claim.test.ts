import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rosterEmailClaimConflict } from "@/lib/auth/roster-email-user-claim";

describe("rosterEmailClaimConflict", () => {
  const student = { id: "stu-1", userId: null as string | null };

  it("allows orphan user rows to be claimed", () => {
    assert.equal(
      rosterEmailClaimConflict(
        { id: "u-1", role: "STUDENT", studentProfile: null, coachProfile: null },
        student
      ),
      null
    );
  });

  it("blocks coach email reuse", () => {
    assert.match(
      rosterEmailClaimConflict(
        { id: "u-1", role: "COACH", studentProfile: null, coachProfile: { id: "c-1" } },
        student
      ) ?? "",
      /coach login/i
    );
  });

  it("allows same student profile", () => {
    assert.equal(
      rosterEmailClaimConflict(
        { id: "u-1", role: "STUDENT", studentProfile: { id: "stu-1" }, coachProfile: null },
        student
      ),
      null
    );
  });
});
