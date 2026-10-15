"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type {
  WorkoutDayAssignmentReview,
  WorkoutDayAthlete,
  WorkoutDayReview,
} from "@/lib/queries/workout-day-review";
import { cn } from "@/lib/utils";

type SortKey = { kind: "name" } | { kind: "lift"; exerciseId: string };

function statusLabel(status: string) {
  if (status === "COMPLETED") return "Done";
  if (status === "IN_PROGRESS") return "In progress";
  return "Not started";
}

function sortAthletes(athletes: WorkoutDayAthlete[], sort: SortKey, dir: "asc" | "desc") {
  const sign = dir === "asc" ? 1 : -1;
  return [...athletes].sort((a, b) => {
    if (sort.kind === "name") return a.name.localeCompare(b.name) * sign;
    const av = a.cells[sort.exerciseId]?.value;
    const bv = b.cells[sort.exerciseId]?.value;
    if (av == null && bv == null) return a.name.localeCompare(b.name);
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av === bv) return a.name.localeCompare(b.name);
    return (av - bv) * sign;
  });
}

export function WorkoutDayReview({
  review,
  focusAssignmentId,
}: {
  review: WorkoutDayReview;
  focusAssignmentId?: string | null;
}) {
  useEffect(() => {
    if (!focusAssignmentId) return;
    document.getElementById(`day-review-${focusAssignmentId}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [focusAssignmentId, review.date]);

  return (
    <section id="day-review" className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Day review</h2>
        <p className="text-xs text-muted">
          {review.date} · every athlete on that workout, one column per lift. Sort a lift to see who
          was strongest. Open sets for the weights they used.
        </p>
      </div>
      {review.assignments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-card-border px-4 py-8 text-center text-sm text-muted">
          No workout is scheduled for this day.
        </p>
      ) : (
        review.assignments.map((assignment) => (
          <AssignmentReview
            key={assignment.assignmentId}
            assignment={assignment}
            focused={assignment.assignmentId === focusAssignmentId}
          />
        ))
      )}
    </section>
  );
}

function AssignmentReview({
  assignment,
  focused,
}: {
  assignment: WorkoutDayAssignmentReview;
  focused: boolean;
}) {
  const [sort, setSort] = useState<SortKey>({ kind: "name" });
  const [dir, setDir] = useState<"asc" | "desc">("asc");

  function toggleSort(next: SortKey) {
    const same =
      sort.kind === next.kind &&
      (sort.kind === "name" || (sort.kind === "lift" && next.kind === "lift" && sort.exerciseId === next.exerciseId));
    if (same) {
      setDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSort(next);
    setDir(next.kind === "name" ? "asc" : "desc");
  }

  const athletes = useMemo(() => sortAthletes(assignment.athletes, sort, dir), [assignment.athletes, sort, dir]);
  const anyoneImproved = assignment.summaries.some((summary) => summary.improved.length > 0);

  return (
    <article
      id={`day-review-${assignment.assignmentId}`}
      className={cn(
        "rounded-2xl border bg-card/40 p-3 sm:p-4",
        focused ? "border-accent/50 ring-1 ring-accent/30" : "border-card-border"
      )}
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">{assignment.templateName}</h3>
        <p className="text-xs text-muted">
          {assignment.completedCount}/{assignment.rosterCount} finished
        </p>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {assignment.summaries.map((summary) => (
          <div key={summary.exerciseId} className="rounded-xl border border-card-border bg-background/40 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium">{summary.name}</p>
              <p className="text-[11px] text-muted">{summary.loggedCount} logged</p>
            </div>
            {summary.improved.length === 0 ? (
              <p className="mt-2 text-xs text-muted">No one beat their previous projected max.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {summary.improved.map((row) => (
                  <li key={row.studentId} className="flex items-baseline justify-between gap-2">
                    <span className={cn("truncate text-sm", row.standout ? "font-semibold text-success" : "text-foreground")}>
                      {row.name}
                    </span>
                    <span className={cn("shrink-0 text-right", row.standout ? "text-sm font-bold text-success" : "text-xs text-emerald-300/80")}>
                      <span className="block">{row.deltaDisplay}</span>
                      <span className="block font-normal text-[10px] text-muted">
                        {row.fromDisplay} → {row.toDisplay}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      {!anyoneImproved && assignment.athletes.length > 0 ? (
        <p className="mb-3 text-xs text-muted">
          Improvements show up here when a projected max beats that athlete’s previous best.
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-card-border">
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <thead className="bg-card/80 text-xs text-muted">
            <tr>
              <th className="sticky left-0 z-10 bg-card px-3 py-2">
                <SortButton
                  label="Athlete"
                  active={sort.kind === "name"}
                  dir={dir}
                  onClick={() => toggleSort({ kind: "name" })}
                />
              </th>
              {assignment.lifts.map((lift) => (
                <th key={lift.exerciseId} className="px-3 py-2">
                  <SortButton
                    label={lift.name}
                    active={sort.kind === "lift" && sort.exerciseId === lift.exerciseId}
                    dir={dir}
                    onClick={() => toggleSort({ kind: "lift", exerciseId: lift.exerciseId })}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {athletes.length === 0 ? (
              <tr>
                <td colSpan={assignment.lifts.length + 1} className="px-3 py-6 text-center text-muted">
                  No athletes on this workout.
                </td>
              </tr>
            ) : (
              athletes.map((athlete) => (
                <tr key={athlete.studentId} className="border-t border-card-border/70">
                  <th className="sticky left-0 z-10 bg-background px-3 py-2 text-left font-medium">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{athlete.name}</span>
                      {athlete.provisional ? (
                        <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-200">
                          Temporary
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] font-normal text-muted">
                      <span>{statusLabel(athlete.status)}</span>
                      {athlete.sessionId ? (
                        <Link
                          href={`/coach/programs/session/${athlete.sessionId}`}
                          className="font-medium text-accent hover:underline"
                        >
                          Sets
                        </Link>
                      ) : null}
                    </div>
                  </th>
                  {assignment.lifts.map((lift) => {
                    const cell = athlete.cells[lift.exerciseId];
                    return (
                      <td key={lift.exerciseId} className="px-3 py-2 align-top">
                        <div className={cn("font-mono tabular-nums", cell?.improved && "font-semibold text-success")}>
                          {cell?.display ?? "—"}
                        </div>
                        {cell?.bestSet ? <div className="text-[11px] text-muted">{cell.bestSet}</div> : null}
                        {cell?.improved && cell.deltaDisplay ? (
                          <div className="text-[11px] font-medium text-success">{cell.deltaDisplay}</div>
                        ) : cell?.isFirst && cell.value != null ? (
                          <div className="text-[11px] text-muted">New</div>
                        ) : cell?.deltaDisplay && cell.delta != null && cell.delta < 0 ? (
                          <div className="text-[11px] text-muted">{cell.deltaDisplay}</div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-left font-semibold text-foreground">
      <span>{label}</span>
      {active ? (
        dir === "asc" ? <ArrowUp className="h-3 w-3 text-accent" /> : <ArrowDown className="h-3 w-3 text-accent" />
      ) : null}
    </button>
  );
}
