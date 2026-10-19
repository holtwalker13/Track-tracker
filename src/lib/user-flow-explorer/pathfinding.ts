import type { FlowGraph, FlowNavigationEdge, UserFlowRole } from "./types";

export type PathResult = {
  routes: string[];
  edges: FlowNavigationEdge[];
  clickCount: number;
  found: boolean;
};

/** BFS shortest path using navigation + redirect edges (ignores auth/modal self-loops). */
export function shortestPath(
  graph: FlowGraph,
  startRoute: string,
  endRoute: string,
  role: UserFlowRole = "COACH"
): PathResult {
  if (startRoute === endRoute) {
    return { routes: [startRoute], edges: [], clickCount: 0, found: true };
  }

  const allowedKinds = new Set(["navigation", "redirect", "conditional"]);
  const adj = new Map<string, FlowNavigationEdge[]>();

  for (const e of graph.edges) {
    if (!allowedKinds.has(e.kind)) continue;
    if (e.source === e.target) continue;
    if (!e.roles.includes(role) && !e.roles.includes("PUBLIC")) continue;
    const list = adj.get(e.source) ?? [];
    list.push(e);
    adj.set(e.source, list);
  }

  const queue: string[] = [startRoute];
  const prev = new Map<string, { route: string; edge: FlowNavigationEdge }>();
  const seen = new Set<string>([startRoute]);

  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === endRoute) break;
    for (const e of adj.get(cur) ?? []) {
      if (seen.has(e.target)) continue;
      seen.add(e.target);
      prev.set(e.target, { route: cur, edge: e });
      queue.push(e.target);
    }
  }

  if (!seen.has(endRoute)) {
    return { routes: [], edges: [], clickCount: -1, found: false };
  }

  const routes: string[] = [endRoute];
  const edges: FlowNavigationEdge[] = [];
  let cur = endRoute;
  while (cur !== startRoute) {
    const p = prev.get(cur);
    if (!p) break;
    edges.unshift(p.edge);
    routes.unshift(p.route);
    cur = p.route;
  }

  return {
    routes,
    edges,
    clickCount: edges.length,
    found: routes[0] === startRoute,
  };
}
