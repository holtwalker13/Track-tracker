"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { ActivityIcon } from "@/lib/activity-icons";
import { cn } from "@/lib/utils";
import { DeleteSessionButton } from "@/components/testing/delete-session-button";

export type SessionResultRow = {
  studentId: string;
  name: string;
  display: string | null;
  status: string;
};

export type SessionActivitySummary = {
  activityId: string;
  slug: string;
  name: string;
  recorded: number;
  total: number;
  recordedRows: SessionResultRow[];
  pendingNames: string[];
};

export function SessionResultsAccordion({
  sessionId,
  sessionName,
  meta,
  activityChips,
  activities,
  hasResults,
}: {
  sessionId: string;
  sessionName: string;
  meta: string;
  activityChips: { slug: string; name: string }[];
  activities: SessionActivitySummary[];
  hasResults: boolean;
}) {
  const totalStudents = activities[0]?.total ?? 0;
  const anyRecorded = activities.some((a) => a.recorded > 0);
  const allDone =
    totalStudents > 0 && activities.every((a) => a.recorded >= a.total && a.total > 0);

  return (
    <details className="group rounded-2xl border border-card-border bg-card open:shadow-sm">
      <summary className="cursor-pointer list-none p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">{sessionName}</h2>
              <ChevronDown
                className="h-4 w-4 shrink-0 text-muted transition group-open:rotate-180"
                aria-hidden
              />
            </div>
            <p className="mt-1 text-sm text-muted">{meta}</p>
            <p className="mt-1 text-sm">
              {totalStudents === 0 ? (
                <span className="text-muted">No athletes on this session yet</span>
              ) : allDone ? (
                <span className="text-success">All stations recorded</span>
              ) : anyRecorded ? (
                <span className="text-sky-300">
                  In progress — expand to see who still needs a mark
                </span>
              ) : (
                <span className="text-muted">Not started</span>
              )}
            </p>
            {activityChips.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {activityChips.map((a) => {
                  const summary = activities.find((x) => x.slug === a.slug);
                  return (
                    <span
                      key={a.slug}
                      className="inline-flex items-center gap-1.5 rounded-full border border-card-border px-2.5 py-1 text-xs"
                    >
                      <ActivityIcon slug={a.slug} className="h-3.5 w-3.5" />
                      {a.name}
                      {summary && totalStudents > 0 && (
                        <span
                          className={cn(
                            "font-mono tabular-nums",
                            summary.recorded >= summary.total
                              ? "text-success"
                              : summary.recorded > 0
                                ? "text-sky-300"
                                : "text-muted"
                          )}
                        >
                          {summary.recorded}/{summary.total}
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          <div
            className="flex flex-wrap items-center gap-2"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Link
              href={`/coach/testing/${sessionId}`}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background"
            >
              {anyRecorded ? "Continue" : "Live testing"}
            </Link>
            <Link
              href={`/coach/testing/${sessionId}/station`}
              className="rounded-lg border border-card-border px-4 py-2 text-sm"
            >
              Student station
            </Link>
            <DeleteSessionButton
              sessionId={sessionId}
              sessionName={sessionName}
              hasResults={hasResults}
            />
          </div>
        </div>
      </summary>

      <div className="space-y-4 border-t border-card-border px-4 py-4 sm:px-5">
        {activities.length === 0 ? (
          <p className="text-sm text-muted">No activities on this session.</p>
        ) : (
          activities.map((act) => (
            <div key={act.activityId} className="rounded-xl border border-card-border/70 bg-background/40 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 font-medium">
                  <ActivityIcon slug={act.slug} className="h-4 w-4" />
                  {act.name}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-mono tabular-nums text-muted">
                    {act.recorded}/{act.total} recorded
                  </span>
                  <Link
                    href={`/coach/testing/${sessionId}?activity=${act.slug}`}
                    className="text-sky-300 hover:underline"
                  >
                    {act.recorded > 0 ? "Continue station" : "Start station"}
                  </Link>
                </div>
              </div>

              {act.recordedRows.length > 0 && (
                <div className="mb-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Recorded
                  </p>
                  <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                    {act.recordedRows.map((row) => (
                      <li
                        key={`${act.activityId}-${row.studentId}`}
                        className="flex items-baseline justify-between gap-2 rounded-md px-2 py-1 text-sm"
                      >
                        <span>{row.name}</span>
                        <span className="font-mono tabular-nums text-muted">
                          {row.status !== "COMPLETED"
                            ? row.status
                            : (row.display ?? "—")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {act.pendingNames.length > 0 && (
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Still need a mark
                  </p>
                  <p className="text-sm text-muted">{act.pendingNames.join(" · ")}</p>
                </div>
              )}

              {act.total > 0 && act.pendingNames.length === 0 && act.recordedRows.length > 0 && (
                <p className="text-sm text-success">Station complete</p>
              )}
            </div>
          ))
        )}
      </div>
    </details>
  );
}
