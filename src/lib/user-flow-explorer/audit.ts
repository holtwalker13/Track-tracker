import type { FlowGraph, FlowNavigationEdge, UxAuditFinding, UserFlowRole } from "./types";

function outbound(edges: FlowNavigationEdge[], route: string): FlowNavigationEdge[] {
  return edges.filter((e) => e.source === route && e.kind !== "auth");
}

function inbound(edges: FlowNavigationEdge[], route: string): FlowNavigationEdge[] {
  return edges.filter((e) => e.target === route);
}

export function runUxAudit(
  graph: FlowGraph,
  role?: UserFlowRole
): UxAuditFinding[] {
  const findings: UxAuditFinding[] = [];
  const nodes = role
    ? graph.nodes.filter((n) => n.roles.includes(role) || n.roles.includes("PUBLIC"))
    : graph.nodes;

  const nodeRoutes = new Set(nodes.map((n) => n.route));
  const edges = graph.edges.filter(
    (e) =>
      nodeRoutes.has(e.source) &&
      (nodeRoutes.has(e.target) || e.kind === "modal")
  );

  for (const n of nodes) {
    if (n.route === "/login") continue;
    const inc = inbound(edges, n.route).filter((e) => e.kind !== "auth");
    if (inc.length === 0 && n.route !== "/" && !n.route.startsWith("/login")) {
      findings.push({
        kind: "orphan",
        severity: n.isDynamic ? "info" : "warning",
        verified: !n.isDynamic,
        screenId: n.id,
        message: `${n.title} (${n.route}) has no verified inbound navigation.`,
        recommendation: n.isDynamic
          ? "Expected for deep links — confirm entry points manually."
          : "Add nav or deep-link documentation.",
      });
    }

    const out = outbound(edges, n.route);
    const realOut = out.filter((e) => e.target !== n.route);
    const isRedirectOnly =
      n.componentPath.includes("redirect(") ||
      ["/coach/school", "/coach/compete", "/coach/classes", "/coach/students"].includes(n.route);
    if (realOut.length === 0 && !n.isDynamic && !isRedirectOnly) {
      findings.push({
        kind: "dead_end",
        severity: "warning",
        verified: true,
        screenId: n.id,
        message: `${n.title} has no outbound navigation edges (excluding modals/auth).`,
        recommendation: "Confirm back nav or hub tabs reach this screen.",
      });
    }

    if (realOut.length > 8) {
      findings.push({
        kind: "excessive_branching",
        severity: "info",
        verified: false,
        screenId: n.id,
        message: `${n.title} has ${realOut.length} outbound connections (heuristic).`,
        recommendation: "Consider grouping related destinations in hub UI.",
      });
    }
  }

  const byTarget = new Map<string, FlowNavigationEdge[]>();
  for (const e of edges) {
    if (e.kind === "modal" || e.source === e.target) continue;
    const list = byTarget.get(e.target) ?? [];
    list.push(e);
    byTarget.set(e.target, list);
  }
  for (const [target, list] of byTarget) {
    const labels = new Set(list.map((e) => e.label));
    if (list.length > 3 && labels.size < list.length / 2) {
      findings.push({
        kind: "duplicate_destination",
        severity: "info",
        verified: false,
        screenId: graph.nodes.find((n) => n.route === target)?.id,
        message: `Multiple paths lead to ${target} (${list.length} edges).`,
      });
    }
  }

  return findings;
}

export function connectionCounts(
  graph: FlowGraph,
  nodeId: string
): { inbound: number; outbound: number } {
  const node = graph.nodes.find((n) => n.id === nodeId);
  if (!node) return { inbound: 0, outbound: 0 };
  return {
    inbound: graph.edges.filter((e) => e.target === node.route).length,
    outbound: graph.edges.filter((e) => e.source === node.route).length,
  };
}

export function findingsForScreen(
  findings: UxAuditFinding[],
  screenId: string
): UxAuditFinding[] {
  return findings.filter((f) => f.screenId === screenId);
}
