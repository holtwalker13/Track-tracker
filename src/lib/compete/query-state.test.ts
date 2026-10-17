import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLeaderboardSearchParams,
  filterSummaryShort,
  parseLeaderboardSearchParams,
  queryRequestKey,
  reconcileDraftGroup,
} from "@/lib/compete/query-state";

describe("compete query-state", () => {
  it("parses and rebuilds committed leaderboard params", () => {
    const sp = new URLSearchParams(
      "coachId=c1&classId=cl1&subgroupId=sg1&event=broad-jump&period=week&gender=M&scope=global&grades=2028"
    );
    const q = parseLeaderboardSearchParams(sp, {
      coachId: "default-coach",
      classId: "default-class",
      subgroupId: null,
    });
    assert.equal(q.coachId, "c1");
    assert.equal(q.classId, "cl1");
    assert.equal(q.subgroupId, "sg1");
    assert.equal(q.eventSlug, "broad-jump");
    assert.equal(q.period, "week");
    assert.equal(q.gender, "M");
    assert.equal(q.scope, "global");
    assert.deepEqual(q.grades, [2028]);

    const rebuilt = buildLeaderboardSearchParams(q);
    assert.equal(rebuilt.get("coachId"), "c1");
    assert.equal(rebuilt.get("classId"), "cl1");
    assert.equal(rebuilt.get("subgroupId"), "sg1");
    assert.equal(rebuilt.get("event"), "broad-jump");
    assert.equal(rebuilt.get("period"), "week");
    assert.equal(rebuilt.get("gender"), "M");
    assert.equal(rebuilt.get("scope"), "global");
    assert.equal(rebuilt.get("grades"), "2028");
  });

  it("builds stable request keys for stale-response guards", () => {
    const a = queryRequestKey({
      coachId: "c1",
      classId: "cl1",
      subgroupId: null,
      eventSlug: "broad-jump",
      period: "semester",
      gender: "F",
      scope: "school",
      grades: [2026, 2027, 2028, 2029],
    });
    const b = queryRequestKey({
      coachId: "c1",
      classId: "cl2",
      subgroupId: null,
      eventSlug: "broad-jump",
      period: "semester",
      gender: "F",
      scope: "school",
      grades: [2026, 2027, 2028, 2029],
    });
    assert.notEqual(a, b);
  });

  it("reconciles invalid child group selections", () => {
    const next = reconcileDraftGroup(
      { coachId: "missing", classId: "missing", subgroupId: "missing" },
      {
        coaches: [{ id: "c1" }],
        classes: [{ id: "cl1" }],
        subgroups: [{ id: "sg1" }],
        allClassesValue: "all",
      }
    );
    assert.deepEqual(next, { coachId: "c1", classId: "all", subgroupId: "" });
  });

  it("formats filter summary with best mark semantics", () => {
    const summary = filterSummaryShort({
      period: "semester",
      gender: "F",
      scope: "school",
    });
    assert.equal(summary, "Semester · Girls · Best mark");
  });
});
