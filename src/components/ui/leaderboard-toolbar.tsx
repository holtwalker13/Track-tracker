"use client";

import { Suspense } from "react";
import { PeriodPills } from "@/components/ui/period-pills";
import { GenderToggle } from "@/components/ui/gender-toggle";
import { LeaderboardFilterModal } from "@/components/ui/leaderboard-filter-modal";

type ClassOption = { id: string; name: string; period: string | null };

function LeaderboardToolbarInner({
  classes,
  lockedGender,
}: {
  classes: ClassOption[];
  lockedGender?: "M" | "F";
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:mb-7">
      <div className="flex min-w-0 max-w-full flex-1 flex-wrap items-center gap-2.5 sm:gap-3">
        <PeriodPills />
        <span className="h-6 w-px shrink-0 bg-card-border" aria-hidden />
        <GenderToggle variant="inline" lockedGender={lockedGender} />
      </div>
      <LeaderboardFilterModal classes={classes} showGender={false} />
    </div>
  );
}

export function LeaderboardToolbar(props: {
  classes: ClassOption[];
  lockedGender?: "M" | "F";
}) {
  return (
    <Suspense
      fallback={
        <div className="mb-5 h-10 animate-pulse rounded-full bg-card/40" aria-hidden />
      }
    >
      <LeaderboardToolbarInner {...props} />
    </Suspense>
  );
}
