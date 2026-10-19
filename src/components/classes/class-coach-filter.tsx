"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { coachDisplayName, type ClassCoachOption } from "@/lib/coach-display";

const PARAM = "coach";

function ClassCoachFilterInner({
  coaches,
  totalCount,
  filteredCount,
}: {
  coaches: ClassCoachOption[];
  totalCount: number;
  filteredCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get(PARAM) ?? "all";

  function onChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!next || next === "all") params.delete(PARAM);
    else params.set(PARAM, next);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:justify-end">
      <label className="flex min-w-0 items-center gap-2 text-sm text-muted">
        <span className="shrink-0 font-medium uppercase tracking-wide text-[10px] sm:text-xs">
          Coach
        </span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-[min(100%,16rem)] rounded-lg border border-card-border bg-card px-2.5 py-2 text-sm text-foreground"
          aria-label="Filter classes by coach"
        >
          <option value="all">All coaches</option>
          <option value="unassigned">Unassigned</option>
          {coaches.map((c) => (
            <option key={c.id} value={c.id}>
              {coachDisplayName(c)}
            </option>
          ))}
        </select>
      </label>
      {filteredCount !== totalCount ? (
        <span className="text-xs text-muted">
          Showing {filteredCount} of {totalCount}
        </span>
      ) : null}
    </div>
  );
}

export function ClassCoachFilter(props: {
  coaches: ClassCoachOption[];
  totalCount: number;
  filteredCount: number;
}) {
  return (
    <Suspense fallback={null}>
      <ClassCoachFilterInner {...props} />
    </Suspense>
  );
}
