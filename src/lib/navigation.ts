import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  GitCompare,
  LayoutDashboard,
  LineChart,
  Target,
  TrendingUp,
  Trophy,
  ClipboardList,
  Gauge,
  Users,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/coach" || href === "/student") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const COACH_NAV: NavItem[] = [
  { href: "/coach", label: "Dashboard", icon: LayoutDashboard },
  { href: "/coach/students", label: "Students", icon: Users },
  { href: "/coach/testing", label: "Testing", icon: ClipboardList },
  { href: "/coach/leaderboards", label: "Leaderboards", icon: Trophy },
  { href: "/coach/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/coach/benchmarks", label: "Benchmarks", icon: Target },
  { href: "/coach/compare", label: "Compare", icon: GitCompare },
];

export const STUDENT_NAV: NavItem[] = [
  { href: "/student", label: "Dashboard", icon: LayoutDashboard },
  { href: "/student/performance", label: "My Performance", icon: Gauge },
  { href: "/student/progress", label: "Progress", icon: TrendingUp },
  { href: "/student/leaderboards", label: "Leaderboards", icon: Trophy },
  { href: "/student/compare", label: "Compare", icon: GitCompare },
  { href: "/student/projection", label: "Projection", icon: LineChart },
];
