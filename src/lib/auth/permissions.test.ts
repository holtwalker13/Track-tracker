import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canAccessStudentRecord, canViewStudentIdentity } from "@/lib/auth/permissions";

describe("permissions", () => {
  it("students only view identity within their school and own record", () => {
    const session = {
      userId: "u1",
      role: "STUDENT" as const,
      schoolId: "school-a",
      studentId: "stu-1",
    };
    assert.equal(canViewStudentIdentity(session, "school-a", "stu-1"), true);
    assert.equal(canViewStudentIdentity(session, "school-b", "stu-1"), false);
    assert.equal(canViewStudentIdentity(session, "school-a", "stu-2"), false);
  });

  it("admins require school context for cross-tenant access", () => {
    const session = {
      userId: "admin",
      role: "ADMIN" as const,
      schoolId: "school-a",
    };
    assert.equal(canAccessStudentRecord(session, "stu-1", "school-a"), true);
    assert.equal(canAccessStudentRecord(session, "stu-1", "school-b"), false);
  });
});
