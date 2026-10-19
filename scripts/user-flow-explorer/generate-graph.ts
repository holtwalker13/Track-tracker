#!/usr/bin/env tsx
/**
 * Regenerate data/user-flow-explorer/graph.json from the codebase.
 * Run: npm run user-flows:scan
 */
import fs from "node:fs";
import path from "node:path";
import { discoverAppRoutes } from "../../src/lib/user-flow-explorer/discover-routes";
import { extractNavigationEdges } from "../../src/lib/user-flow-explorer/extract-edges";
import type { FlowGraph } from "../../src/lib/user-flow-explorer/types";

const OUT_DIR = path.join(process.cwd(), "data/user-flow-explorer");
const OUT_FILE = path.join(OUT_DIR, "graph.json");
const SCREENSHOTS_DIR = path.join(OUT_DIR, "screenshots");
const SCANNER_VERSION = "1.0.0";

function screenshotSlug(route: string): string {
  return route.replace(/^\//, "").replace(/\//g, "__").replace(/:/g, "_") || "root";
}

function attachScreenshots(nodes: ReturnType<typeof discoverAppRoutes>) {
  for (const n of nodes) {
    if (n.isDynamic) {
      n.screenshotStatus = "manual_review";
      continue;
    }
    const file = path.join(SCREENSHOTS_DIR, `${screenshotSlug(n.route)}.png`);
    if (fs.existsSync(file)) {
      n.screenshotPath = `/api/internal/user-flows/screenshots/${screenshotSlug(n.route)}.png`;
      n.screenshotStatus = "captured";
    } else {
      n.screenshotPath = null;
      n.screenshotStatus = "missing";
    }
  }
}

function loadPreviousGraph(): FlowGraph | null {
  if (!fs.existsSync(OUT_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(OUT_FILE, "utf8")) as FlowGraph;
  } catch {
    return null;
  }
}

function main() {
  let nodes = discoverAppRoutes();

  const internalNode = nodes.find((n) => n.route === "/internal/user-flows");
  if (!internalNode) {
    nodes.push({
      id: "internal__user-flows",
      route: "/internal/user-flows",
      title: "User Flow Explorer",
      category: "internal",
      roles: ["ADMIN"],
      componentPath: "src/app/internal/user-flows/page.tsx",
      isDynamic: false,
      screenshotPath: null,
      screenshotStatus: "missing",
      sourceFiles: ["src/app/internal/user-flows/page.tsx"],
      notes: [],
    });
    nodes.sort((a, b) => a.route.localeCompare(b.route));
  }

  attachScreenshots(nodes);
  const edges = extractNavigationEdges(nodes);

  const manualReviewCount =
    nodes.filter((n) => n.screenshotStatus === "manual_review").length +
    edges.filter((e) => !e.verified).length;

  const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as {
    version?: string;
  };

  const graph: FlowGraph = {
    meta: {
      generatedAt: new Date().toISOString(),
      appVersion: pkg.version ?? "0.0.0",
      scannerVersion: SCANNER_VERSION,
      routeCount: nodes.length,
      edgeCount: edges.length,
      manualReviewCount,
    },
    nodes,
    edges,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const prev = loadPreviousGraph();
  if (prev) {
    const prevRoutes = new Set(prev.nodes.map((n) => n.route));
    const nextRoutes = new Set(nodes.map((n) => n.route));
    const added = [...nextRoutes].filter((r) => !prevRoutes.has(r));
    const removed = [...prevRoutes].filter((r) => !nextRoutes.has(r));
    if (added.length || removed.length) {
      console.log("Route diff vs previous graph:");
      for (const r of added) console.log("  +", r);
      for (const r of removed) console.log("  -", r);
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(graph, null, 2));
  console.log(`Wrote ${nodes.length} nodes, ${edges.length} edges → ${OUT_FILE}`);
}

main();
