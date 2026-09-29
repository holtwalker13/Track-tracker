"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { addDays, format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  type CalendarAssignment,
  weekStartMonday,
} from "@/lib/queries/programs-hub";
import { cn } from "@/lib/utils";
import { todayDateString } from "@/lib/services/workouts";

export function ProgramsWeekCalendar({
  weekStart,
  weeks,
  assignments,
  selectedDate,
}: {
  weekStart: string;
  weeks: number;
  assignments: CalendarAssignment[];
  selectedDate: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const byDate = new Map<string, CalendarAssignment[]>();
  for (const a of assignments) {
    const list = byDate.get(a.date) ?? [];
    list.push(a);
    byDate.set(a.date, list);
  }

  const days = Array.from({ length: weeks * 7 }, (_, i) =>
    format(addDays(parseISO(weekStart), i), "yyyy-MM-dd")
  );

  function setParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === "") params.delete(k);
      else params.set(k, v);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function shiftWeek(delta: number) {
    const next = format(addDays(parseISO(weekStart), delta * 7), "yyyy-MM-dd");
    setParams({ week: next });
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-card-border bg-gradient-to-b from-card to-card/40 p-3 sm:p-4",
        pending && "opacity-70"
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Week calendar</h2>
          <p className="text-xs text-muted">One class at a time · click a day for logs</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            className="rounded-lg border border-card-border p-1.5 text-muted hover:text-foreground"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setParams({ week: weekStartMonday(todayDateString()) })}
            className="rounded-lg border border-card-border px-2.5 py-1 text-xs font-medium"
          >
            This week
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            className="rounded-lg border border-card-border p-1.5 text-muted hover:text-foreground"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {days.map((date) => {
          const dayAssignments = byDate.get(date) ?? [];
          const selected = date === selectedDate;
          const isToday = date === todayDateString();
          const dow = format(parseISO(date), "EEE");
          const dayNum = format(parseISO(date), "d");
          const weekBreak = days.indexOf(date) > 0 && days.indexOf(date) % 7 === 0;

          return (
            <button
              key={date}
              type="button"
              onClick={() => setParams({ date, logView: "day" })}
              className={cn(
                "flex min-h-[5.5rem] flex-col rounded-xl border px-1.5 py-1.5 text-left transition sm:min-h-[6.5rem] sm:px-2",
                selected
                  ? "border-accent/50 bg-accent/10 ring-1 ring-accent/40"
                  : "border-card-border/80 bg-background/30 hover:border-foreground/25",
                isToday && !selected && "border-sky-400/40",
                weekBreak && "mt-0"
              )}
            >
              <div className="mb-1 flex items-baseline justify-between gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {dow}
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold tabular-nums",
                    isToday ? "text-sky-300" : "text-foreground"
                  )}
                >
                  {dayNum}
                </span>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
                {dayAssignments.length === 0 ? (
                  <span className="text-[10px] text-muted/70">—</span>
                ) : (
                  dayAssignments.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-md bg-sky-500/10 px-1 py-0.5 ring-1 ring-sky-400/25"
                    >
                      <div className="truncate text-[10px] font-medium leading-tight text-sky-100 sm:text-[11px]">
                        {a.templateName}
                      </div>
                      <div className="text-[9px] tabular-nums text-muted sm:text-[10px]">
                        {a.totalCount > 0
                          ? `${a.completedCount}/${a.totalCount} logged`
                          : "No roster"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setParams({ weeks: String(weeks + 1) })}
          className="rounded-lg border border-card-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground"
        >
          Show next week
        </button>
        {weeks > 1 ? (
          <button
            type="button"
            onClick={() => setParams({ weeks: String(Math.max(1, weeks - 1)) })}
            className="rounded-lg border border-card-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground"
          >
            Fewer weeks
          </button>
        ) : null}
      </div>
    </section>
  );
}
