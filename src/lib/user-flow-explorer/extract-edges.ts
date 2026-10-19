import fs from "node:fs";
import path from "node:path";
import {
  COACH_NAV,
  COMPETE_HUB_TABS,
  SCHOOL_HUB_TABS,
  STUDENT_NAV,
  ADMIN_NAV,
} from "@/lib/navigation";
import type { EdgeKind, FlowNavigationEdge, FlowScreenNode, UserFlowRole } from "./types";
import { nodeIdFromRoute } from "./discover-routes";

const APP_DIR = path.join(process.cwd(), "src/app");

function edgeId(source: string, target: string, label: string): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  return `${nodeIdFromRoute(source)}__${nodeIdFromRoute(target)}__${slug}`;
}

export function resolveTarget(href: string, nodes: FlowScreenNode[]): string | null {
  const cleaned = href.split("?")[0]?.split("#")[0]?.trim() ?? "";
  if (!cleaned.startsWith("/")) return null;
  if (cleaned.includes("${")) return null;

  const normalized = cleaned.replace(/\/$/, "") || "/";
  const exact = nodes.find((n) => n.route === normalized);
  if (exact) return exact.route;

  for (const n of nodes) {
    if (!n.route.includes(":")) continue;
    const pattern = "^" + n.route.replace(/:[^/]+/g, "[^/]+") + "$";
    if (new RegExp(pattern).test(normalized)) return n.route;
  }
  return null;
}

function addEdge(
  edges: Map<string, FlowNavigationEdge>,
  opts: {
    source: string;
    target: string;
    label: string;
    kind: EdgeKind;
    roles: UserFlowRole[];
    verified: boolean;
    sourceFile?: string;
    condition?: string;
  }
) {
  if (opts.source === opts.target && opts.kind !== "modal") return;
  const id = edgeId(opts.source, opts.target, opts.label);
  if (edges.has(id)) return;
  edges.set(id, { id, ...opts });
}

function navEdgesForRoute(
  edges: Map<string, FlowNavigationEdge>,
  nodes: FlowScreenNode[],
  sourceRoute: string,
  nav: { href: string; label: string }[],
  roles: UserFlowRole[]
) {
  if (!nodes.some((n) => n.route === sourceRoute)) return;
  for (const item of nav) {
    const target = resolveTarget(item.href, nodes);
    if (!target) continue;
    addEdge(edges, {
      source: sourceRoute,
      target,
      label: `Nav: ${item.label}`,
      kind: "navigation",
      roles,
      verified: true,
      sourceFile: "src/lib/navigation.ts",
    });
  }
  addEdge(edges, {
    source: sourceRoute,
    target: "/login",
    label: "Sign out",
    kind: "auth",
    roles,
    verified: true,
    sourceFile: "src/components/layout/top-nav.tsx",
  });
}

function extractHrefsFromFile(filePath: string): string[] {
  const content = fs.readFileSync(filePath, "utf8");
  const hrefs = new Set<string>();
  const patterns = [
    /href=["'](\/[^"'?#]+)/g,
    /href=\{["'](\/[^"'?#]+)["']\}/g,
    /router\.push\(\s*["'](\/[^"'?#]+)/g,
    /redirect\(\s*["'](\/[^"'?#]+)/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      hrefs.add(m[1]);
    }
  }
  return [...hrefs];
}

function routesForPageFile(pageAbs: string, nodes: FlowScreenNode[]): string[] {
  const rel = path.relative(APP_DIR, pageAbs).replace(/\\/g, "/");
  const withoutPage = rel.replace(/\/page\.tsx$/, "");
  const segments = withoutPage.split("/").filter(Boolean);
  const routeSegments = segments.map((s) =>
    s.startsWith("[") && s.endsWith("]") ? `:${s.slice(1, -1)}` : s
  );
  const route = "/" + routeSegments.join("/");
  const normalized = route === "/" ? "/" : route.replace(/\/$/, "") || "/";
  if (nodes.some((n) => n.route === normalized)) return [normalized];
  return [];
}

function scanPageFiles(edges: Map<string, FlowNavigationEdge>, nodes: FlowScreenNode[]) {
  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "page.tsx") {
        const routes = routesForPageFile(full, nodes);
        const rel = path.relative(process.cwd(), full).replace(/\\/g, "/");
        for (const href of extractHrefsFromFile(full)) {
          const target = resolveTarget(href, nodes);
          if (!target) continue;
          for (const source of routes) {
            addEdge(edges, {
              source,
              target,
              label: `Page link → ${path.basename(target)}`,
              kind: "navigation",
              roles: inferRolesFromRoute(source),
              verified: true,
              sourceFile: rel,
            });
          }
        }
      }
    }
  }
  walk(APP_DIR);
}

function inferRolesFromRoute(route: string): UserFlowRole[] {
  if (route.startsWith("/student")) return ["STUDENT"];
  if (route.startsWith("/coach")) return ["COACH", "ADMIN"];
  if (route.startsWith("/admin")) return ["ADMIN"];
  if (route.startsWith("/login") || route.startsWith("/join")) return ["PUBLIC"];
  return ["PUBLIC", "STUDENT", "COACH", "ADMIN"];
}

/** Static navigation edges from nav config, redirects, and page-level href scanning. */
export function extractNavigationEdges(nodes: FlowScreenNode[]): FlowNavigationEdge[] {
  const edges = new Map<string, FlowNavigationEdge>();
  const nodeRoutes = new Set(nodes.map((n) => n.route));

  for (const n of nodes.filter((x) => x.category === "coach" && !x.isDynamic)) {
    navEdgesForRoute(edges, nodes, n.route, COACH_NAV, ["COACH", "ADMIN"]);
  }

  for (const n of nodes.filter((x) => x.category === "student" && !x.isDynamic)) {
    navEdgesForRoute(edges, nodes, n.route, STUDENT_NAV, ["STUDENT"]);
  }

  if (nodeRoutes.has("/admin")) {
    for (const item of ADMIN_NAV) {
      const target = resolveTarget(item.href, nodes);
      if (!target) continue;
      addEdge(edges, {
        source: "/admin",
        target,
        label: `Nav: ${item.label}`,
        kind: "navigation",
        roles: ["ADMIN"],
        verified: true,
        sourceFile: "src/lib/navigation.ts",
      });
    }
  }

  for (const tab of SCHOOL_HUB_TABS) {
    for (const source of [
      "/coach/school/roster",
      "/coach/school/classes",
      "/coach/school/coaches",
      "/coach/school/privacy",
    ]) {
      if (!nodeRoutes.has(source)) continue;
      const target = resolveTarget(tab.href, nodes);
      if (!target) continue;
      addEdge(edges, {
        source,
        target,
        label: `School tab: ${tab.label}`,
        kind: "navigation",
        roles: ["COACH", "ADMIN"],
        verified: true,
        sourceFile: "src/lib/navigation.ts",
      });
    }
  }

  for (const tab of COMPETE_HUB_TABS) {
    for (const source of ["/coach/compete/leaderboards", "/coach/compete/compare"]) {
      if (!nodeRoutes.has(source)) continue;
      const target = resolveTarget(tab.href, nodes);
      if (!target) continue;
      addEdge(edges, {
        source,
        target,
        label: `Compete tab: ${tab.label}`,
        kind: "navigation",
        roles: ["COACH", "ADMIN"],
        verified: true,
        sourceFile: "src/lib/navigation.ts",
      });
    }
  }

  const redirectPages: {
    route: string;
    target: string;
    label: string;
    condition?: string;
  }[] = [
    { route: "/", target: "/login", label: "No session", condition: "unauthenticated" },
    { route: "/", target: "/student", label: "Student session", condition: "role=STUDENT" },
    {
      route: "/",
      target: "/admin",
      label: "Admin without school",
      condition: "role=ADMIN,no schoolId",
    },
    {
      route: "/",
      target: "/coach/school/roster",
      label: "Coach / admin with school",
      condition: "role=COACH|ADMIN",
    },
    { route: "/coach/school", target: "/coach/school/roster", label: "School hub index" },
    { route: "/coach/compete", target: "/coach/compete/leaderboards", label: "Compete hub index" },
    { route: "/coach/classes", target: "/coach/school/classes", label: "Legacy classes URL" },
    { route: "/coach/students", target: "/coach/school/roster", label: "Legacy students URL" },
    {
      route: "/coach/leaderboards",
      target: "/coach/compete/leaderboards",
      label: "Legacy leaderboards URL",
    },
    { route: "/coach/compare", target: "/coach/compete/compare", label: "Legacy compare URL" },
    { route: "/coach/testing", target: "/coach/programs", label: "Testing merged into Programs" },
    { route: "/coach/school/overview", target: "/coach/school/coaches", label: "Overview redirect" },
    {
      route: "/coach/classes/:id",
      target: "/coach/school/classes/:id",
      label: "Legacy class detail",
    },
  ];

  for (const r of redirectPages) {
    if (!nodeRoutes.has(r.route)) continue;
    const target = resolveTarget(r.target, nodes) ?? r.target;
    if (!nodeRoutes.has(target) && !target.includes(":")) continue;
    addEdge(edges, {
      source: r.route,
      target,
      label: r.label,
      kind: r.condition ? "conditional" : "redirect",
      roles: ["PUBLIC", "STUDENT", "COACH", "ADMIN"],
      verified: true,
      sourceFile: "src/app (redirect pages)",
      condition: r.condition,
    });
  }

  scanPageFiles(edges, nodes);

  addEdge(edges, {
    source: "/login",
    target: "/login/school-email",
    label: "Must claim school email",
    kind: "conditional",
    roles: ["STUDENT", "COACH"],
    verified: true,
    sourceFile: "src/components/layout/app-shell.tsx",
    condition: "userMustClaimSchoolEmail",
  });

  addEdge(edges, {
    source: "/login",
    target: "/login/demo/admin",
    label: "Demo admin link",
    kind: "navigation",
    roles: ["PUBLIC"],
    verified: true,
    sourceFile: "src/components/auth/login-page-footer.tsx",
  });
  addEdge(edges, {
    source: "/login",
    target: "/login/demo/student",
    label: "Demo student link",
    kind: "navigation",
    roles: ["PUBLIC"],
    verified: true,
    sourceFile: "src/components/auth/login-page-footer.tsx",
  });

  addModalHints(edges, nodes);

  return [...edges.values()].sort(
    (a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target)
  );
}

function addModalHints(edges: Map<string, FlowNavigationEdge>, nodes: FlowScreenNode[]) {
  const programs = nodes.find((n) => n.route === "/coach/programs");
  if (programs) {
    addEdge(edges, {
      source: "/coach/programs",
      target: "/coach/programs",
      label: "Modal: Add workout / testing / attendance",
      kind: "modal",
      roles: ["COACH", "ADMIN"],
      verified: true,
      sourceFile: "src/components/workouts/programs-day-add-dialog.tsx",
    });
  }
  const leaderboards = nodes.filter(
    (n) => n.route.includes("leaderboards") && !n.isDynamic
  );
  for (const lb of leaderboards) {
    addEdge(edges, {
      source: lb.route,
      target: lb.route,
      label: "Modal: Leaderboard filters",
      kind: "modal",
      roles: lb.category === "student" ? ["STUDENT"] : ["COACH", "ADMIN"],
      verified: true,
      sourceFile: "src/components/ui/leaderboard-filter-modal.tsx",
    });
  }
}
