import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rankResults } from "@/lib/services/leaderboard";

describe("rankResults", () => {
  it("gives equal marks the same rank and skips the next number", () => {
    const ranked = rankResults(
      [
        { studentId: "a", value: 10 },
        { studentId: "b", value: 10 },
        { studentId: "c", value: 9 },
      ],
      "HIGHER_BETTER"
    );
    assert.deepEqual(
      ranked.map((row) => row.rank),
      [1, 1, 3]
    );
  });

  it("ties lower-is-better marks the same way", () => {
    const ranked = rankResults(
      [
        { studentId: "a", value: 4.8 },
        { studentId: "b", value: 4.9 },
        { studentId: "c", value: 4.8 },
      ],
      "LOWER_BETTER"
    );
    assert.deepEqual(
      ranked.map((row) => ({ id: row.studentId, rank: row.rank })),
      [
        { id: "a", rank: 1 },
        { id: "c", rank: 1 },
        { id: "b", rank: 3 },
      ]
    );
  });
});
