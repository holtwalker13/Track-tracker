"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { ActivityIcon } from "@/lib/activity-icons";
import {
  ACTIVITY_ABBR,
  DISPLAY_GROUP_LABELS,
  DISPLAY_GROUP_ORDER,
  activityDisplayGroup,
} from "@/lib/activity-groups";
import { cn } from "@/lib/utils";

export function ActivityChartPicker({
  activities,
  selected,
}: {
  activities: { slug: string; name: string }[];
  selected: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const selectedActivity = activities.find((a) => a.slug === selected) ?? activities[0];

  const grouped = useMemo(() => {
    const bags: Record<string, typeof activities> = {
      running: [],
      jumping: [],
      other: [],
    };
    for (const a of activities) {
      bags[activityDisplayGroup(a.slug)].push(a);
    }
    return bags;
  }, [activities]);

  function select(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("activity", slug);
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="mb-4">
      <p className="mb-1 text-sm text-muted">Event</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full max-w-sm items-center gap-3 rounded-lg border border-card-border bg-card px-3 py-2 text-left text-foreground transition hover:border-sky-400/40 hover:bg-sky-400/5"
      >
        {selectedActivity && (
          <ActivityIcon slug={selectedActivity.slug} className="h-5 w-5 shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate font-medium">
          {selectedActivity?.name ?? "Select event"}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted" aria-hidden />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Select event"
            className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-card-border bg-card shadow-2xl shadow-black/40"
          >
            <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300/80">
                  Progress chart
                </p>
                <h2 className="text-lg font-semibold">Choose an event</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-card-border text-muted hover:text-foreground"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-6 overflow-y-auto p-5">
              {DISPLAY_GROUP_ORDER.map((group) => {
                const items = grouped[group] ?? [];
                if (items.length === 0) return null;
                return (
                  <section key={group}>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                      {DISPLAY_GROUP_LABELS[group]}
                    </h3>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {items.map((a) => {
                        const active = a.slug === selected;
                        return (
                          <button
                            key={a.slug}
                            type="button"
                            onClick={() => select(a.slug)}
                            className={cn(
                              "flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center transition",
                              active
                                ? "border-sky-400/60 bg-sky-400/15 text-sky-200 shadow-[0_0_18px_rgba(56,189,248,0.25)]"
                                : "border-card-border bg-background/60 text-foreground hover:border-sky-400/35 hover:bg-sky-400/5"
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-12 w-12 items-center justify-center rounded-full",
                                active ? "bg-sky-400/20" : "bg-card"
                              )}
                            >
                              <ActivityIcon slug={a.slug} className="h-6 w-6" />
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                              {ACTIVITY_ABBR[a.slug] ?? a.slug.slice(0, 4).toUpperCase()}
                            </span>
                            <span className="line-clamp-2 text-sm font-medium leading-snug">
                              {a.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
