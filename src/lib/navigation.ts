/** Serializable nav config (safe to pass from Server Components to TopNav). */
export type NavIconKey =
  | "dashboard"
  | "users"
  | "clipboard"
  | "trophy"
  | "chart"
  | "target"
  | "compare"
  | "gauge"
  | "trending"
  | "projection"
  | "classes";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconKey;
};

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/coach" || href === "/student") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const COACH_NAV: NavItem[] = [
  { href: "/coach/leaderboards", label: "Leaderboards", icon: "trophy" },
  { href: "/coach/students", label: "Roster", icon: "users" },
  { href: "/coach/testing", label: "Testing", icon: "clipboard" },
  { href: "/coach/classes", label: "Classes", icon: "classes" },
  { href: "/coach/analytics", label: "Analytics", icon: "chart" },
  { href: "/coach/benchmarks", label: "KPI targets", icon: "target" },
  { href: "/coach/compare", label: "Compare", icon: "compare" },
  { href: "/coach", label: "Dashboard", icon: "dashboard" },
];

export const STUDENT_NAV: NavItem[] = [
  { href: "/student", label: "Dashboard", icon: "dashboard" },
  { href: "/student/performance", label: "My Performance", icon: "gauge" },
  { href: "/student/progress", label: "Progress", icon: "trending" },
  { href: "/student/leaderboards", label: "Leaderboards", icon: "trophy" },
  { href: "/student/compare", label: "Compare", icon: "compare" },
  { href: "/student/projection", label: "Projection", icon: "projection" },
];
