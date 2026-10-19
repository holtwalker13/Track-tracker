import fs from "node:fs";
import path from "node:path";
import type { FlowGraph, FlowLayoutState } from "./types";

export const GRAPH_PATH = path.join(process.cwd(), "data/user-flow-explorer/graph.json");
export const LAYOUT_PATH = path.join(process.cwd(), "data/user-flow-explorer/layout.json");

export function loadFlowGraph(): FlowGraph | null {
  if (!fs.existsSync(GRAPH_PATH)) return null;
  const raw = fs.readFileSync(GRAPH_PATH, "utf8");
  return JSON.parse(raw) as FlowGraph;
}

export function loadFlowLayout(): FlowLayoutState | null {
  if (!fs.existsSync(LAYOUT_PATH)) return null;
  const raw = fs.readFileSync(LAYOUT_PATH, "utf8");
  return JSON.parse(raw) as FlowLayoutState;
}

export function saveFlowLayout(layout: FlowLayoutState): void {
  fs.mkdirSync(path.dirname(LAYOUT_PATH), { recursive: true });
  fs.writeFileSync(LAYOUT_PATH, JSON.stringify(layout, null, 2));
}
