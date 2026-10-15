import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSaveQueue, wasSaved } from "./client-save";

describe("wasSaved", () => {
  it("is true only when the server says the row was saved", () => {
    assert.equal(wasSaved({ saved: true }), true);
    assert.equal(wasSaved({ saved: false }), false);
    assert.equal(wasSaved({}), false);
    assert.equal(wasSaved(null), false);
  });
});

describe("createSaveQueue", () => {
  it("runs overlapping saves for one key one at a time and keeps the latest payload", async () => {
    const seen: string[] = [];
    let releaseFirst: (() => void) | undefined;
    const first = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let calls = 0;
    const enqueue = createSaveQueue<string>(async (value) => {
      calls += 1;
      if (calls === 1) await first;
      seen.push(value);
    });

    const a = enqueue("row", "first");
    const b = enqueue("row", "second");
    await Promise.resolve();
    assert.equal(calls, 1);
    releaseFirst?.();
    await Promise.all([a, b]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(seen, ["first", "second"]);
    assert.equal(calls, 2);
  });
});