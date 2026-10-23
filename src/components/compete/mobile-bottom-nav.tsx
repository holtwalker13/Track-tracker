"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Ellipsis, School, Target, Trophy } from "lucide-react";
import { isNavActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/coach/programs", label: "Programs", icon: Dumbbell },
  { href: "/coach/school/roster", label: "School", icon: School },
  { href: "/coach/benchmarks", label: "KPIs", icon: Target },
  { href: "/coach/compete/leaderboards", label: "Compete", icon: Trophy },
] as const;

export function MobileBottomNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#30373B] bg-background md:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex justify-around px-1 pt-2">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            label === "Compete"
              ? isNavActive(pathname, "/coach/compete")
              : isNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 min-w-[3.4rem] flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium",
                active ? "text-accent" : "text-muted"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          className="flex min-h-11 min-w-[3.4rem] flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium text-muted"
        >
          <Ellipsis className="h-5 w-5 shrink-0" aria-hidden />
          More
        </button>
      </div>
    </nav>
  );
}
