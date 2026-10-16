import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { credentialMatchesRosterStudent } from "@/lib/services/class-join-match";

describe("credentialMatchesRosterStudent", () => {
  const student = {
    studentNumber: "S0012",
    username: "jsmith2028",
    userEmail: "s0012@demo.local",
    rosterEmail: null as string | null,
    schoolSlug: "demo",
  };

  it("matches username, student id, and school email", () => {
    assert.equal(credentialMatchesRosterStudent({ ...student, credential: "jsmith2028" }), true);
    assert.equal(credentialMatchesRosterStudent({ ...student, credential: "s0012" }), true);
    assert.equal(credentialMatchesRosterStudent({ ...student, credential: "S0012@demo.local" }), true);
  });

  it("rejects an email that is not on the roster", () => {
    assert.equal(
      credentialMatchesRosterStudent({ ...student, credential: "joey@gmail.com" }),
      false
    );
  });

  it("matches roster upload email when domain differs from school login domain", () => {
    assert.equal(
      credentialMatchesRosterStudent({
        ...student,
        rosterEmail: "joey@gmail.com",
        credential: "joey@gmail.com",
      }),
      true
    );
  });
});
