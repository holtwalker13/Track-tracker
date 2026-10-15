"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { WorkoutLogRow } from "@/components/workouts/workout-logs-panel";
import { coachFacingWorkoutStatus } from "@/lib/services/workouts";
import { cn } from "@/lib/utils";

export function ProgramsActivityPanel({
  rows,
  date,
  logView,
  weekLabel,
}: {
  rows: WorkoutLogRow[];
  date: string;
  logView: "day" | "week";
  weekLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [showAll, setShowAll] = useState(false);

  function setLogView(next: "day" | "week") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("logView", next);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  useEffect(() => {
    setShowAll(false);
  }, [date, logView]);

  const completed = rows.filter((r) => coachFacingWorkoutStatus(r.status, r.setLogCount) === "COMPLETED").length;
  const visible = showAll ? rows : rows.slice(0, 5);

  return (
    <section
      className={cn(
        "flex h-full flex-col rounded-2xl border border-card-border bg-gradient-to-b from-card to-card/40 p-3 sm:p-4",
        pending && "opacity-70"
      )}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Activity logs</h2>
          <p className="text-xs text-muted">
            {logView === "day" ? `Day · ${date}` : `Week · ${weekLabel}`}
            {rows.length > 0 ? ` · ${completed}/${rows.length} done` : ""}
            {logView === "day" ? " · click a workout or test to review it" : ""}
          </p>
        </div>
        <div className="flex rounded-lg border border-card-border p-0.5">
          <button
            type="button"
            onClick={() => setLogView("day")}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium",
              logView === "day" ? "bg-accent/15 text-accent" : "text-muted"
            )}
          >
            Day
          </button>
          <button
            type="button"
            onClick={() => setLogView("week")}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium",
              logView === "week" ? "bg-accent/15 text-accent" : "text-muted"
            )}
          >
            Week
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-card-border px-3 py-6 text-center text-sm text-muted">
            No workout logs for this {logView === "day" ? "day" : "week"}.
          </p>
        ) : (
          visible.map((r) => (
            <div
              key={`${r.studentId}-${r.programName}-${r.sessionId ?? "none"}`}
              className="flex items-center justify-between gap-2 rounded-xl border border-card-border/70 bg-background/30 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {r.studentName}
                  {r.provisional ? (
                    <span className="ml-2 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-200">
                      Temporary
                    </span>
                  ) : null}
                </div>
                <div className="truncate text-xs text-muted">{r.programName}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusPill status={coachFacingWorkoutStatus(r.status, r.setLogCount)} />
                {r.sessionId ? (
                  <Link
                    href={`/coach/programs/session/${r.sessionId}`}
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    Open
                  </Link>
                ) : (
                  <span className="text-xs text-muted">—</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {rows.length > 5 && !showAll ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-3 text-center text-xs font-medium text-accent hover:underline"
        >
          View all ({rows.length})
        </button>
      ) : (
        <Link
          href={`/coach/programs/logs?date=${encodeURIComponent(date)}`}
          className="mt-3 text-center text-xs font-medium text-accent hover:underline"
        >
          Open full logs →
        </Link>
      )}
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const label =
    status === "COMPLETED" ? "Done" : status === "IN_PROGRESS" ? "In progress" : "Not started";
  const tone =
    status === "COMPLETED"
      ? "bg-emerald-500/15 text-emerald-300"
      : status === "IN_PROGRESS"
        ? "bg-amber-500/15 text-amber-200"
        : "bg-card text-muted";
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", tone)}>
      {label}
    </span>
  );
}
