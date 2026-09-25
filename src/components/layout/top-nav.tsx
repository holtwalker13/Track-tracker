"use client";

import Link from "next/link";
import {
  BarChart3,
  ClipboardList,
  Dumbbell,
  GitCompare,
  Gauge,
  LayoutDashboard,
  LineChart,
  LogOut,
  School,
  Target,
  TrendingUp,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { isNavActive, type NavIconKey, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const NAV_ICONS: Record<NavIconKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  users: Users,
  clipboard: ClipboardList,
  workout: Dumbbell,
  trophy: Trophy,
  chart: BarChart3,
  target: Target,
  compare: GitCompare,
  gauge: Gauge,
  trending: TrendingUp,
  projection: LineChart,
  classes: School,
};

export function TopNav({
  items,
  compact = false,
}: {
  items: NavItem[];
  compact?: boolean;
}) {
  const pathname = usePathname();

  const linkClassName = cn(
    "flex shrink-0 snap-start flex-col items-center justify-center rounded-lg text-muted transition hover:bg-card hover:text-foreground",
    compact
      ? "min-w-[2.75rem] max-w-[3.5rem] gap-0 px-1.5 py-1 md:min-w-0 md:max-w-none md:gap-0.5 md:px-2.5 md:py-1.5"
      : "min-w-[4.25rem] max-w-[5.75rem] gap-0.5 px-2.5 py-2 md:min-w-0 md:max-w-none md:px-3"
  );

  const labelClassName = cn(
    "text-center font-medium uppercase tracking-wide",
    compact
      ? "hidden text-[9px] leading-tight md:block md:text-xs"
      : "text-[10px] leading-tight md:text-sm md:leading-snug"
  );

  return (
    <nav
      aria-label="Main"
      className={cn(
        "flex snap-x snap-mandatory gap-0.5 overflow-x-auto overscroll-x-contain",
        "-mx-3 px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-4 sm:px-4",
        "md:mx-0 md:flex-wrap md:justify-end md:overflow-visible md:snap-none md:px-0",
        compact ? "pt-0.5 pb-0.5" : "pt-1 pb-1.5 md:pt-0 md:pb-0"
      )}
    >
      {items.map((item) => {
        const Icon = NAV_ICONS[item.icon];
        const active = isNavActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={item.label}
            className={cn(
              linkClassName,
              active && "bg-accent/15 text-accent ring-1 ring-accent/40"
            )}
          >
            <Icon className={cn("shrink-0", compact ? "h-4 w-4 md:h-5 md:w-5" : "h-5 w-5")} aria-hidden />
            <span className={labelClassName}>{item.label}</span>
          </Link>
        );
      })}
      <form action="/api/auth/logout" method="POST" className="contents">
        <button type="submit" className={linkClassName} title="Sign out">
          <LogOut className={cn("shrink-0", compact ? "h-4 w-4 md:h-5 md:w-5" : "h-5 w-5")} aria-hidden />
          <span className={labelClassName}>Sign out</span>
        </button>
      </form>
    </nav>
  );
}
