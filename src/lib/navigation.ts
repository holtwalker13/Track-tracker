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
  if (href === "/coach/programs") {
    return (
      pathname === "/coach/programs" ||
      pathname.startsWith("/coach/programs/") ||
      pathname === "/coach/testing" ||
      pathname.startsWith("/coach/testing/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const SCHOOL_HUB_TABS = [
  { href: "/coach/school/roster", label: "Roster" },
  { href: "/coach/school/classes", label: "Classes" },
  { href: "/coach/school/coaches", label: "Coaches" },
  { href: "/coach/school/privacy", label: "Privacy" },
] as const;

export const COMPETE_HUB_TABS = [
  { href: "/coach/compete/leaderboards", label: "Leaderboards" },
  { href: "/coach/compete/compare", label: "Compare" },
] as const;

export const COACH_NAV: NavItem[] = [
  { href: "/coach/school/roster", label: "School", icon: "classes" },
  { href: "/coach/programs", label: "Programs", icon: "workout" },
  { href: "/coach/benchmarks", label: "KPIs", icon: "target" },
  { href: "/coach/compete", label: "Compete", icon: "trophy" },
];

/** Primary destinations shown in mobile bottom navigation. */
export const COACH_MOBILE_PRIMARY_NAV = [
  { href: "/coach/school/roster", label: "School" as const },
  { href: "/coach/programs", label: "Programs" as const },
  { href: "/coach/benchmarks", label: "KPIs" as const },
  { href: "/coach/compete/leaderboards", label: "Compete" as const },
] as const;

/** Secondary coach destinations surfaced in the More sheet (not duplicated in bottom nav). */
export const COACH_MORE_NAV: NavItem[] = [
  { href: "/coach/analytics", label: "Analytics", icon: "chart" },
  { href: "/coach/programs/lifts", label: "Lift library", icon: "workout" },
  { href: "/coach/programs/logs", label: "Workout logs", icon: "clipboard" },
  { href: "/coach/compete/compare", label: "Compare", icon: "compare" },
  { href: "/coach/school/overview", label: "School overview", icon: "classes" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Admin", icon: "admin" },
  ...COACH_NAV,
];

export const STUDENT_NAV: NavItem[] = [
  { href: "/student", label: "Dashboard", icon: "dashboard" },
  { href: "/student/accolades", label: "Accolades", icon: "trophy" },
  { href: "/student/workout", label: "Log workout", icon: "workout" },
  { href: "/student/performance", label: "My Performance", icon: "gauge" },
  { href: "/student/progress", label: "Progress", icon: "trending" },
  { href: "/student/leaderboards", label: "Leaderboards", icon: "trophy" },
  { href: "/student/compare", label: "Compare", icon: "compare" },
  { href: "/student/projection", label: "Projection", icon: "projection" },
];
