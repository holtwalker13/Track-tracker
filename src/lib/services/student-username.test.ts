import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildStudentUsernameBase } from "./student-username";

describe("student-username", () => {
  it("builds first initial + last name + grad year", () => {
    assert.equal(buildStudentUsernameBase("Jane", "Smith", 2028), "jsmith2028");
    assert.equal(buildStudentUsernameBase("Ty", "Crowden", 2027), "tcrowden2027");
  });

  it("strips non-alphanumeric from last name", () => {
    assert.equal(buildStudentUsernameBase("Mary", "O'Brien", 2029), "mobrien2029");
  });
});
