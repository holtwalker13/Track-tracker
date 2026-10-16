import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emailAllowedByPolicy,
  emailDomain,
  emailMatchesRoster,
  loginPolicyForSlug,
  resolveSchoolSlugFromEmailDomain,
} from "@/lib/school-login-email";

describe("resolveSchoolSlugFromEmailDomain", () => {
  it("maps Cape High placeholder and legacy sandbox domains", () => {
    assert.equal(resolveSchoolSlugFromEmailDomain("coach@capehigh.placeholder"), "chs");
    assert.equal(resolveSchoolSlugFromEmailDomain("student1@chs.demo"), "chs");
  });

  it("maps Jackson student and faculty domains", () => {
    assert.equal(resolveSchoolSlugFromEmailDomain("ada@jacksonindians.us"), "jhs");
    assert.equal(resolveSchoolSlugFromEmailDomain("coach@jackson.k12.mo.us"), "jhs");
  });

  it("returns null for unrelated domains", () => {
    assert.equal(resolveSchoolSlugFromEmailDomain("user@gmail.com"), null);
  });
});

describe("Jackson login policy", () => {
  const policy = loginPolicyForSlug("jhs");

  it("requires the student and faculty domains", () => {
    assert.equal(emailAllowedByPolicy({ email: "ada@jacksonindians.us", audience: "student", policy }), true);
    assert.equal(emailAllowedByPolicy({ email: "ada@jacksonindians.us", audience: "faculty", policy }), false);
    assert.equal(emailAllowedByPolicy({ email: "coach@jackson.k12.mo.us", audience: "faculty", policy }), true);
    assert.equal(emailAllowedByPolicy({ email: "kid@gmail.com", audience: "student", policy }), false);
  });

  it("accepts an admin exception for that role only", () => {
    const exceptions = [{ email: "kid@gmail.com", role: "STUDENT" }];
    assert.equal(
      emailAllowedByPolicy({ email: "kid@gmail.com", audience: "student", policy, exceptions }),
      true
    );
    assert.equal(
      emailAllowedByPolicy({ email: "kid@gmail.com", audience: "faculty", policy, exceptions }),
      false
    );
  });
});

describe("emailMatchesRoster", () => {
  it("accepts the roster address even when it is outside the school domain", () => {
    assert.equal(emailMatchesRoster("Test@Gmail.com", "test@gmail.com"), true);
    assert.equal(emailMatchesRoster("other@gmail.com", "test@gmail.com"), false);
    assert.equal(emailMatchesRoster("test@gmail.com", null), false);
  });
});

describe("emailDomain", () => {
  it("extracts normalized domain", () => {
    assert.equal(emailDomain("  Coach@CapeHigh.PLACEHOLDER "), "capehigh.placeholder");
  });
});
