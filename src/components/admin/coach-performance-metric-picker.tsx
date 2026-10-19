"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DistrictReportMetricOption } from "@/lib/queries/admin-coach-performance";
import { cn } from "@/lib/utils";

export function CoachPerformanceMetricPicker({
  catalog,
  selectedSlugs,
}: {
  catalog: DistrictReportMetricOption[];
  selectedSlugs: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const selected = useMemo(() => new Set(selectedSlugs), [selectedSlugs]);

  const byCategory = useMemo(() => {
    const map = new Map<string, DistrictReportMetricOption[]>();
    for (const item of catalog) {
      const list = map.get(item.categoryName) ?? [];
      list.push(item);
      map.set(item.categoryName, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [catalog]);

  function pushSlugs(next: Set<string>) {
    const params = new URLSearchParams(searchParams.toString());
    const slugs = [...next];
    if (slugs.length === 0) params.delete("metrics");
    else params.set("metrics", slugs.join(","));
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  function toggle(slug: string) {
    const next = new Set(selected);
    if (next.has(slug)) {
      if (next.size <= 1) return;
      next.delete(slug);
    } else {
      next.add(slug);
    }
    pushSlugs(next);
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-card-border bg-card/40 p-4",
        pending && "opacity-70"
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Report KPIs</p>
          <p className="mt-1 text-sm text-muted">
            Choose any metrics for this district report. Selection is saved in the URL (
            {selected.size} selected).
          </p>
        </div>
      </div>
      <div className="mt-4 max-h-64 space-y-4 overflow-y-auto pr-1">
        {byCategory.map(([category, items]) => (
          <div key={category}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
              {category}
            </p>
            <div className="flex flex-wrap gap-2">
              {items.map((item) => {
                const active = selected.has(item.slug);
                return (
                  <button
                    key={item.slug}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggle(item.slug)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-left text-xs font-semibold transition",
                      active ? "filter-chip-active" : "filter-chip-inactive"
                    )}
                  >
                    {item.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
