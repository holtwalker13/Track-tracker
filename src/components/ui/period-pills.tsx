"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import {
  LEADERBOARD_PERIODS,
  parseLeaderboardPeriod,
  type LeaderboardPeriod,
} from "@/lib/leaderboard-periods";

function PeriodPillsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = parseLeaderboardPeriod(searchParams.get("period"));

  function select(period: LeaderboardPeriod) {
    const params = new URLSearchParams(searchParams.toString());
    if (period === "week") params.delete("period");
    else params.set("period", period);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div
      className="flex snap-x gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="group"
      aria-label="Leaderboard time window"
    >
      {LEADERBOARD_PERIODS.map((p) => {
        const isActive = active === p.id;
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => select(p.id)}
            className={cn(
              "shrink-0 snap-start rounded-full px-4 py-2 text-sm font-semibold transition",
              isActive
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25"
                : "border border-card-border text-muted hover:border-sky-400/40 hover:text-sky-200"
            )}
          >
            {p.shortLabel}
          </button>
        );
      })}
    </div>
  );
}

export function PeriodPills() {
  return (
    <Suspense fallback={<div className="h-10 animate-pulse rounded-full bg-card/40" />}>
      <PeriodPillsInner />
    </Suspense>
  );
}
