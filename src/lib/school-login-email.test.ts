import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emailDomain,
  resolveSchoolSlugFromEmailDomain,
} from "@/lib/school-login-email";

describe("resolveSchoolSlugFromEmailDomain", () => {
  it("maps Cape High placeholder and legacy sandbox domains", () => {
    assert.equal(resolveSchoolSlugFromEmailDomain("coach@capehigh.placeholder"), "chs");
    assert.equal(resolveSchoolSlugFromEmailDomain("student1@chs.demo"), "chs");
  });

  it("returns null for unrelated domains", () => {
    assert.equal(resolveSchoolSlugFromEmailDomain("user@gmail.com"), null);
  });
});

describe("emailDomain", () => {
  it("extracts normalized domain", () => {
    assert.equal(emailDomain("  Coach@CapeHigh.PLACEHOLDER "), "capehigh.placeholder");
  });
});
