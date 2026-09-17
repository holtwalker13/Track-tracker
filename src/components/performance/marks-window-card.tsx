"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DISPLAY_GROUP_LABELS, DISPLAY_GROUP_ORDER } from "@/lib/activity-groups";
import type { MarksWindow } from "@/lib/queries/marks-window";
import { cn } from "@/lib/utils";
import { ActivityIcon } from "@/lib/activity-icons";

function labelDay(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MarksWindowCard({ window }: { window: MarksWindow }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const stat = searchParams.get("stat") === "pr" ? "pr" : "avg";
  const dates = window.dates;
  const fromIdx = Math.max(0, dates.indexOf(window.from));
  const toIdx = dates.length ? Math.max(fromIdx, dates.indexOf(window.to)) : 0;

  const presets = useMemo(() => {
    const fall = dates.filter((d) => d.slice(5, 7) <= "12" && d.slice(5, 7) >= "08");
    const spring = dates.filter((d) => d.slice(5, 7) <= "07");
    return [
      { id: "all", label: "All tests", from: dates[0], to: dates[dates.length - 1] },
      { id: "fall", label: "Fall", from: fall[0], to: fall[fall.length - 1] },
      { id: "spring", label: "Spring", from: spring[0], to: spring[spring.length - 1] },
    ].filter((p) => p.from && p.to);
  }, [dates]);

  function setParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  if (dates.length === 0) {
    return (
      <div className="rounded-2xl border border-card-border bg-card p-5">
        <h2 className="text-lg font-semibold">Average vs PR</h2>
        <p className="mt-2 text-sm text-muted">No dated tests yet. Live testing records a test date so this fills in.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-card-border bg-card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Average vs PR</h2>
          <p className="mt-1 text-sm text-muted">
            Dial the window to a semester or a pair of test days. Average is every mark in range;
            PR is the best in that same window.
          </p>
        </div>
        <div className="grid grid-cols-2 rounded-lg bg-background p-1">
          {(["avg", "pr"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setParams({ stat: id === "avg" ? "" : "pr" })}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-semibold",
                stat === id ? "bg-sky-500 text-white" : "text-muted"
              )}
            >
              {id === "avg" ? "Average" : "PR"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setParams({ from: p.from!, to: p.to! })}
            className="rounded-full border border-card-border px-3 py-1 text-xs font-medium text-muted hover:text-foreground"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        <label className="block text-xs uppercase tracking-wider text-muted">
          From {labelDay(dates[fromIdx] ?? "")}
          <input
            type="range"
            min={0}
            max={Math.max(0, dates.length - 1)}
            value={fromIdx}
            onChange={(e) => {
              const nextFrom = Number(e.target.value);
              const nextTo = Math.max(nextFrom, toIdx);
              setParams({ from: dates[nextFrom]!, to: dates[nextTo]! });
            }}
            className="mt-1 w-full accent-sky-500"
          />
        </label>
        <label className="block text-xs uppercase tracking-wider text-muted">
          To {labelDay(dates[toIdx] ?? "")}
          <input
            type="range"
            min={0}
            max={Math.max(0, dates.length - 1)}
            value={toIdx}
            onChange={(e) => {
              const nextTo = Number(e.target.value);
              const nextFrom = Math.min(fromIdx, nextTo);
              setParams({ from: dates[nextFrom]!, to: dates[nextTo]! });
            }}
            className="mt-1 w-full accent-amber-400"
          />
        </label>
      </div>

      <div className="mt-6 space-y-5">
        {DISPLAY_GROUP_ORDER.map((group) => {
          const rows = window.marks.filter((m) => m.group === group);
          if (rows.length === 0) return null;
          return (
            <div key={group}>
              <p className="mb-2 text-sm font-semibold text-muted">{DISPLAY_GROUP_LABELS[group]}</p>
              <ul className="space-y-2">
                {rows.map((row) => (
                  <li key={row.activityId} className="flex items-center justify-between gap-3 text-sm">
                    <span className="inline-flex items-center gap-2">
                      <ActivityIcon slug={row.activitySlug} categorySlug={row.categorySlug} className="h-4 w-4" />
                      {row.activityName}
                      <span className="text-xs text-muted">{row.count} test{row.count === 1 ? "" : "s"}</span>
                    </span>
                    <span className="font-mono font-bold tabular-nums">
                      {stat === "pr" ? row.prDisplay : row.avgDisplay}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
