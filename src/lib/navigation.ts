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
  | "classes"
  | "workout"
  | "admin";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconKey;
};

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/coach" || href === "/student") {
    return pathname === href;
  }
  if (href === "/coach/school/roster") {
    return pathname === "/coach/school" || pathname.startsWith("/coach/school/");
  }
  if (href === "/coach/compete") {
    return pathname === "/coach/compete" || pathname.startsWith("/coach/compete/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const SCHOOL_HUB_TABS = [
  { href: "/coach/school/roster", label: "Roster" },
  { href: "/coach/school/classes", label: "Classes" },
  { href: "/coach/school/overview", label: "School" },
] as const;

export const COMPETE_HUB_TABS = [
  { href: "/coach/compete/leaderboards", label: "Leaderboards" },
  { href: "/coach/compete/compare", label: "Compare" },
] as const;

export const COACH_NAV: NavItem[] = [
  { href: "/coach/school/roster", label: "School", icon: "classes" },
  { href: "/coach/testing", label: "Testing", icon: "clipboard" },
  { href: "/coach/programs", label: "Programs", icon: "workout" },
  { href: "/coach/benchmarks", label: "KPIs", icon: "target" },
  { href: "/coach/compete", label: "Compete", icon: "trophy" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Admin", icon: "admin" },
  ...COACH_NAV,
];

export const STUDENT_NAV: NavItem[] = [
  { href: "/student", label: "Dashboard", icon: "dashboard" },
  { href: "/student/workout", label: "Log workout", icon: "workout" },
  { href: "/student/performance", label: "My Performance", icon: "gauge" },
  { href: "/student/progress", label: "Progress", icon: "trending" },
  { href: "/student/leaderboards", label: "Leaderboards", icon: "trophy" },
  { href: "/student/compare", label: "Compare", icon: "compare" },
  { href: "/student/projection", label: "Projection", icon: "projection" },
];
