import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveCapacitorServer } from "./mobile-server-url";

describe("resolveCapacitorServer", () => {
  it("loads the local shell when no origin is configured", () => {
    assert.deepEqual(resolveCapacitorServer({}), {
      url: null,
      cleartext: false,
      kind: "bundled-shell",
    });
  });

  it("accepts a staging https origin and ignores a trailing slash", () => {
    const resolved = resolveCapacitorServer({
      serverUrl: "https://track-tracker-staging.up.railway.app/",
    });
    assert.equal(resolved.error, undefined);
    assert.equal(resolved.kind, "staging");
    assert.equal(resolved.cleartext, false);
    assert.equal(resolved.url, "https://track-tracker-staging.up.railway.app");
  });

  it("rejects cleartext, credentials, and placeholder hosts for the staged app", () => {
    assert.match(
      resolveCapacitorServer({ serverUrl: "http://192.168.1.8:3847" }).error ?? "",
      /https:\/\//
    );
    assert.match(
      resolveCapacitorServer({ serverUrl: "https://user:secret@staging.example.net" }).error ?? "",
      /password/
    );
    assert.match(
      resolveCapacitorServer({ serverUrl: "https://your-staging-host.up.railway.app" }).error ?? "",
      /real staging/
    );
    assert.match(
      resolveCapacitorServer({ serverUrl: "https://staging.example.net/api?token=1" }).error ?? "",
      /origin only/
    );
  });

  it("allows a private live-reload URL only through the development setting", () => {
    const resolved = resolveCapacitorServer({
      serverUrl: "https://track-tracker-staging.up.railway.app",
      devServerUrl: "http://192.168.1.8:3847",
    });
    assert.equal(resolved.kind, "development");
    assert.equal(resolved.cleartext, true);
    assert.equal(resolved.url, "http://192.168.1.8:3847");
  });

  it("rejects a public http live-reload host", () => {
    const resolved = resolveCapacitorServer({
      devServerUrl: "http://track-tracker.example.net:3847",
    });
    assert.match(resolved.error ?? "", /private-network/);
  });
});
