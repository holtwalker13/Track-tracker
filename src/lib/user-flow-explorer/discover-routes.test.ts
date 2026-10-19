import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { discoverAppRoutes, nodeIdFromRoute } from "./discover-routes";
import { extractNavigationEdges, resolveTarget } from "./extract-edges";
import { loadFlowGraph } from "./load-graph";
import { shortestPath } from "./pathfinding";
import { runUxAudit } from "./audit";

describe("user-flow-explorer discover-routes", () => {
  it("discovers known public auth routes", () => {
    const nodes = discoverAppRoutes();
    const routes = new Set(nodes.map((n) => n.route));
    assert.ok(routes.has("/login"));
    assert.ok(routes.has("/student"));
    assert.ok(routes.has("/coach/programs"));
  });

  it("nodeIdFromRoute is stable", () => {
    assert.equal(nodeIdFromRoute("/coach/testing/:sessionId"), "coach__testing__sessionId");
  });
});

describe("user-flow-explorer graph file", () => {
  it("loads committed graph when present", () => {
    const graph = loadFlowGraph();
    if (!graph) {
      console.log("graph.json not generated yet — skip");
      return;
    }
    assert.ok(graph.nodes.length >= 40);
    assert.ok(graph.edges.length >= 50);
  });
});

describe("user-flow-explorer pathfinding", () => {
  it("finds student nav path dashboard → workout", () => {
    const graph = loadFlowGraph();
    if (!graph) return;
    const path = shortestPath(graph, "/student", "/student/workout", "STUDENT");
    assert.equal(path.found, true);
    assert.ok(path.clickCount >= 1);
  });

  it("resolveTarget matches dynamic routes", () => {
    const nodes = discoverAppRoutes();
    const target = resolveTarget("/coach/testing/abc123", nodes);
    assert.equal(target, "/coach/testing/:sessionId");
  });
});

describe("user-flow-explorer audit", () => {
  it("returns findings array", () => {
    const graph = loadFlowGraph();
    if (!graph) return;
    const findings = runUxAudit(graph, "STUDENT");
    assert.ok(Array.isArray(findings));
  });
});

describe("user-flow-explorer edges", () => {
  it("includes coach nav edges from programs", () => {
    const nodes = discoverAppRoutes();
    const edges = extractNavigationEdges(nodes);
    const fromPrograms = edges.filter(
      (e) => e.source === "/coach/programs" && e.kind === "navigation"
    );
    assert.ok(fromPrograms.length >= 3);
  });
});
