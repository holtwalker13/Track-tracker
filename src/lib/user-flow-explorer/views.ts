import type { FlowGraph, FlowViewId, JourneyPreset, UserFlowRole } from "./types";

export const JOURNEY_PRESETS: JourneyPreset[] = [
  {
    id: "student-dashboard-workout",
    label: "Student: Dashboard → Log workout",
    role: "STUDENT",
    startRoute: "/student",
    endRoute: "/student/workout",
  },
  {
    id: "coach-programs-testing",
    label: "Coach: Programs → Live testing session",
    role: "COACH",
    startRoute: "/coach/programs",
    endRoute: "/coach/testing/:sessionId",
    description: "Dynamic session route — manual review for screenshot.",
  },
  {
    id: "admin-pick-school-roster",
    label: "Admin: Select school → Roster",
    role: "ADMIN",
    startRoute: "/admin",
    endRoute: "/coach/school/roster",
  },
  {
    id: "auth-login-student",
    label: "Auth: Sign in → Student dashboard",
    role: "STUDENT",
    startRoute: "/login",
    endRoute: "/student",
    description: "Post-login redirect — conditional on credentials.",
  },
];

export function filterGraphByView(graph: FlowGraph, view: FlowViewId): FlowGraph {
  if (view === "all") return graph;

  let roles: UserFlowRole[] | null = null;
  let routePrefix: string[] | null = null;

  switch (view) {
    case "student":
      roles = ["STUDENT"];
      routePrefix = ["/student", "/login", "/join", "/"];
      break;
    case "coach":
      roles = ["COACH", "ADMIN"];
      routePrefix = ["/coach", "/login", "/"];
      break;
    case "admin":
      roles = ["ADMIN"];
      routePrefix = ["/admin", "/coach", "/login", "/"];
      break;
    case "auth":
      routePrefix = ["/login", "/join", "/student/join", "/coach/join", "/"];
      break;
    case "journey":
      return graph;
  }

  const nodes = graph.nodes.filter((n) => {
    if (view === "auth") {
      return (
        n.category === "auth" ||
        n.category === "join" ||
        n.route === "/" ||
        n.route === "/login/school-email"
      );
    }
    const roleOk = !roles || n.roles.some((r) => roles!.includes(r) || r === "PUBLIC");
    const prefixOk =
      !routePrefix ||
      routePrefix.some((p) => n.route === p || n.route.startsWith(p + "/") || n.route.startsWith(p));
    return roleOk && prefixOk;
  });

  const routes = new Set(nodes.map((n) => n.route));
  const edges = graph.edges.filter((e) => {
    if (!routes.has(e.source)) return false;
    if (e.kind === "modal" && e.source === e.target) return routes.has(e.source);
    return routes.has(e.target) || e.target.includes(":");
  });

  return { ...graph, nodes, edges };
}

export function filterGraphForJourney(
  graph: FlowGraph,
  preset: JourneyPreset,
  pathRoutes: string[]
): FlowGraph {
  const routeSet = new Set(pathRoutes);
  routeSet.add(preset.startRoute);
  routeSet.add(preset.endRoute);

  const nodes = graph.nodes.filter((n) => routeSet.has(n.route) || pathRoutes.some((p) => p === n.route));
  const routes = new Set(nodes.map((n) => n.route));
  const edges = graph.edges.filter((e) => routes.has(e.source) && routes.has(e.target));

  return { ...graph, nodes, edges };
}
