import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hashInviteToken,
  studentJoinPath,
  studentLoginEmailForNumber,
  validateStudentPassword,
} from "./student-login-invite";

describe("student-login-invite", () => {
  it("builds join path without embedding PII", () => {
    const path = studentJoinPath("abc123");
    assert.match(path, /^\/student\/join\?token=/);
    assert.doesNotMatch(path, /firstName|lastName|studentNumber/i);
  });

  it("hashes tokens deterministically", () => {
    assert.equal(hashInviteToken("x"), hashInviteToken("x"));
    assert.notEqual(hashInviteToken("a"), hashInviteToken("b"));
  });

  it("derives login email from student number", () => {
    assert.equal(studentLoginEmailForNumber("S0001", "jhs"), "s0001@jhs.demo");
  });

  it("validates password strength", () => {
    assert.equal(validateStudentPassword("short1"), "Password must be at least 8 characters.");
    assert.equal(validateStudentPassword("allletters"), "Password must include at least one number.");
    assert.equal(validateStudentPassword("12345678"), "Password must include at least one letter.");
    assert.equal(validateStudentPassword("GoodPass1"), null);
  });
});
