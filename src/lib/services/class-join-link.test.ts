import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classIdFromJoinToken, classJoinPath, classJoinToken } from "@/lib/services/class-join-link";

describe("class join link", () => {
  it("round-trips a class id and rejects a tampered token", () => {
    process.env.SESSION_SECRET = "test-secret-value-16";
    const classId = "cls_track_period_2";
    const token = classJoinToken(classId);
    assert.equal(classIdFromJoinToken(token), classId);
    assert.equal(classIdFromJoinToken(`${token}x`), null);
    assert.match(classJoinPath(classId), /^\/join\/class\?token=/);
  });
});
