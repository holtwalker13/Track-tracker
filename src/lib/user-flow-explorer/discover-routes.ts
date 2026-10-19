import fs from "node:fs";
import path from "node:path";
import type { FlowScreenNode, ScreenCategory, UserFlowRole } from "./types";

const APP_DIR = path.join(process.cwd(), "src/app");

function routeFromPageFile(relativePath: string): { route: string; isDynamic: boolean } {
  const withoutPage = relativePath.replace(/\/page\.tsx$/, "").replace(/\\/g, "/");
  const segments = withoutPage.split("/").filter(Boolean);
  const isDynamic = segments.some((s) => s.startsWith("[") && s.endsWith("]"));
  const routeSegments = segments.map((s) => {
    if (s.startsWith("[") && s.endsWith("]")) {
      return `:${s.slice(1, -1)}`;
    }
    return s;
  });
  const route = "/" + routeSegments.join("/");
  return { route: route === "/" ? "/" : route.replace(/\/$/, "") || "/", isDynamic };
}

function titleFromRoute(route: string): string {
  if (route === "/") return "Home (role redirect)";
  if (route === "/login") return "Sign in";
  if (route === "/login/school-email") return "Claim school email";
  if (route.startsWith("/login/demo/")) {
    const part = route.split("/").pop() ?? "demo";
    return `Demo login (${part})`;
  }
  if (route === "/join/class") return "Join class (public)";
  if (route === "/student/join") return "Student invite join";
  if (route === "/coach/join") return "Coach invite join";
  if (route === "/admin") return "Admin — select school";
  if (route === "/internal/user-flows") return "User Flow Explorer";
  const last = route.split("/").filter(Boolean).pop() ?? "Screen";
  if (last.startsWith(":")) return last.slice(1).replace(/-/g, " ");
  return last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function categoryFromRoute(route: string): ScreenCategory {
  if (route.startsWith("/internal")) return "internal";
  if (route.startsWith("/login") || route === "/") return "auth";
  if (route.startsWith("/join") || route.endsWith("/join")) return "join";
  if (route.startsWith("/student")) return "student";
  if (route.startsWith("/coach")) return "coach";
  if (route.startsWith("/admin")) return "admin";
  return "auth";
}

function rolesForRoute(route: string, category: ScreenCategory): UserFlowRole[] {
  if (route.startsWith("/internal")) return ["ADMIN"];
  if (
    route === "/login" ||
    route.startsWith("/login/") ||
    route === "/join/class" ||
    route === "/student/join" ||
    route === "/coach/join"
  ) {
    return ["PUBLIC"];
  }
  if (route === "/") return ["PUBLIC", "STUDENT", "COACH", "ADMIN"];
  if (category === "student") return ["STUDENT"];
  if (category === "admin") return ["ADMIN", "COACH"];
  if (category === "coach") return ["COACH", "ADMIN"];
  return ["PUBLIC"];
}

function nodeIdFromRoute(route: string): string {
  const parts = route
    .replace(/^\//, "")
    .split("/")
    .filter(Boolean)
    .map((seg) => (seg.startsWith(":") ? seg.slice(1) : seg));
  return parts.join("__") || "root";
}

function walkPages(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkPages(full, acc);
    else if (entry.name === "page.tsx") acc.push(full);
  }
  return acc;
}

/** Discover App Router pages under src/app (excluding api). */
export function discoverAppRoutes(appDir = APP_DIR): FlowScreenNode[] {
  const pages = walkPages(appDir).filter((p) => !p.includes(`${path.sep}api${path.sep}`));
  const nodes: FlowScreenNode[] = [];

  for (const abs of pages) {
    const rel = path.relative(appDir, abs).replace(/\\/g, "/");
    const { route, isDynamic } = routeFromPageFile(rel);
    const category = categoryFromRoute(route);
    const componentPath = `src/app/${rel}`;

    nodes.push({
      id: nodeIdFromRoute(route),
      route,
      title: titleFromRoute(route),
      category,
      roles: rolesForRoute(route, category),
      componentPath,
      isDynamic,
      screenshotPath: null,
      screenshotStatus: isDynamic ? "manual_review" : "missing",
      sourceFiles: [componentPath],
      notes: isDynamic
        ? ["Dynamic segment — use a concrete demo URL for screenshots."]
        : [],
    });
  }

  nodes.sort((a, b) => a.route.localeCompare(b.route));
  return nodes;
}

export { nodeIdFromRoute };
