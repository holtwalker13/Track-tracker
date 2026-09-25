"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { classSectionLabel } from "@/lib/periods";

type ClassOption = { id: string; name: string; period: string | null };

function ClassFilterPillsInner({
  classes,
  includeSchoolOverall = true,
}: {
  classes: ClassOption[];
  includeSchoolOverall?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("classId") ?? (includeSchoolOverall ? "school" : "all");

  function select(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === "school" || id === "all") params.delete("classId");
    else params.set("classId", id);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  if (classes.length === 0) return null;

  const options = [
    ...(includeSchoolOverall
      ? [{ id: "school", label: "Entire school" }]
      : [{ id: "all", label: "All periods" }]),
    ...classes.map((c) => ({ id: c.id, label: classSectionLabel(c) })),
  ];

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="PE class filter">
      {options.map((opt) => {
        const isActive =
          opt.id === "school" || opt.id === "all"
            ? !searchParams.get("classId")
            : active === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => select(opt.id)}
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition",
              isActive
                ? "bg-sky-400/20 text-sky-300 ring-1 ring-sky-400/55"
                : "border border-card-border text-muted hover:border-sky-400/40 hover:text-sky-200"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function ClassFilterPills(props: {
  classes: ClassOption[];
  includeSchoolOverall?: boolean;
}) {
  return (
    <Suspense fallback={<div className="h-9 animate-pulse rounded-full bg-card/40" />}>
      <ClassFilterPillsInner {...props} />
    </Suspense>
  );
}
