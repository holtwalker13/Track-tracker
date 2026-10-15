"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { TestingDayAthlete, TestingDayReview } from "@/lib/queries/testing-log";
import { cn } from "@/lib/utils";

type SortKey = { kind: "name" } | { kind: "activity"; activityId: string; direction: "HIGHER_BETTER" | "LOWER_BETTER" };

function sortAthletes(athletes: TestingDayAthlete[], sort: SortKey, dir: "asc" | "desc") {
  const sign = dir === "asc" ? 1 : -1;
  return [...athletes].sort((a, b) => {
    if (sort.kind === "name") return a.name.localeCompare(b.name) * sign;
    const av = a.cells[sort.activityId]?.value;
    const bv = b.cells[sort.activityId]?.value;
    if (av == null && bv == null) return a.name.localeCompare(b.name);
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av === bv) return a.name.localeCompare(b.name);
    return (av - bv) * sign;
  });
}

export function TestDayReview({ review }: { review: TestingDayReview }) {
  const [sort, setSort] = useState<SortKey>({ kind: "name" });
  const [dir, setDir] = useState<"asc" | "desc">("asc");

  function toggleSort(next: SortKey) {
    const same =
      sort.kind === next.kind &&
      (sort.kind === "name" ||
        (sort.kind === "activity" && next.kind === "activity" && sort.activityId === next.activityId));
    if (same) {
      setDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSort(next);
    setDir(next.kind === "activity" && next.direction === "LOWER_BETTER" ? "asc" : next.kind === "name" ? "asc" : "desc");
  }

  const athletes = useMemo(() => sortAthletes(review.athletes, sort, dir), [review.athletes, sort, dir]);

  return (
    <article id={`day-review-test-${review.sessionId}`} className="rounded-2xl border border-amber-400/30 bg-card/40 p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Day review</h2>
          <p className="text-xs text-muted">
            {review.date} · {review.name}. Best mark on each test. Sort a column to rank the class.
          </p>
        </div>
        <Link href={`/coach/testing/${review.sessionId}`} className="text-xs font-medium text-accent hover:underline">
          Open test
        </Link>
      </div>
      <p className="mb-3 text-xs text-muted">
        {review.recordedCount}/{review.athletes.length} with a mark
      </p>
      <div className="overflow-x-auto rounded-xl border border-card-border">
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <thead className="bg-card/80 text-xs text-muted">
            <tr>
              <th className="sticky left-0 z-10 bg-card px-3 py-2">
                <SortButton label="Athlete" active={sort.kind === "name"} dir={dir} onClick={() => toggleSort({ kind: "name" })} />
              </th>
              {review.activities.map((activity) => (
                <th key={activity.activityId} className="px-3 py-2">
                  <SortButton
                    label={activity.name}
                    active={sort.kind === "activity" && sort.activityId === activity.activityId}
                    dir={dir}
                    onClick={() =>
                      toggleSort({
                        kind: "activity",
                        activityId: activity.activityId,
                        direction: activity.direction,
                      })
                    }
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {athletes.length === 0 ? (
              <tr>
                <td colSpan={review.activities.length + 1} className="px-3 py-6 text-center text-muted">
                  No athletes on this test.
                </td>
              </tr>
            ) : (
              athletes.map((athlete) => (
                <tr key={athlete.studentId} className="border-t border-card-border/70">
                  <th className="sticky left-0 z-10 bg-background px-3 py-2 text-left font-medium">{athlete.name}</th>
                  {review.activities.map((activity) => {
                    const cell = athlete.cells[activity.activityId];
                    return (
                      <td key={activity.activityId} className="px-3 py-2 font-mono tabular-nums">
                        {cell?.display ?? "—"}
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
    <button type="button" onClick={onClick} className={cn("inline-flex items-center gap-1 text-left font-semibold text-foreground")}>
      <span>{label}</span>
      {active ? dir === "asc" ? <ArrowUp className="h-3 w-3 text-accent" /> : <ArrowDown className="h-3 w-3 text-accent" /> : null}
    </button>
  );
}
