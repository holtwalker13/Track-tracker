import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loginDestination } from "@/lib/auth/login-destination";

describe("loginDestination", () => {
  it("keeps students on the student dashboard", () => {
    assert.equal(loginDestination("STUDENT", "/coach/school/roster"), "/student");
    assert.equal(loginDestination("STUDENT", "/admin"), "/student");
    assert.equal(loginDestination("STUDENT", "/student/workout"), "/student/workout");
    assert.equal(loginDestination("STUDENT", ""), "/student");
  });

  it("still sends coaches to a coach path", () => {
    assert.equal(loginDestination("COACH", "/coach/programs"), "/coach/programs");
    assert.equal(loginDestination("COACH", ""), "/coach/school/roster");
  });
});
