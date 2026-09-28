import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isCoachingSportId, matchSportId, sportLabel } from "@/lib/sports";

describe("sports", () => {
  it("labels known sports", () => {
    assert.equal(sportLabel("track"), "Track & Field");
    assert.equal(sportLabel("weightlifting"), "Weightlifting");
  });

  it("validates sport ids", () => {
    assert.equal(isCoachingSportId("football"), true);
    assert.equal(isCoachingSportId("quidditch"), false);
  });

  it("matches free-text student sports", () => {
    assert.equal(matchSportId("Track"), "track");
    assert.equal(matchSportId("varsity basketball"), "basketball");
    assert.equal(matchSportId("weight room"), "weightlifting");
  });
});
