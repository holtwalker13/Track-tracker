"use client";

import Link from "next/link";

export type WorkoutLogRow = {
  sessionId: string | null;
  studentId: string;
  studentName: string;
  studentNumber: string;
  programName: string;
  className: string;
  status: string;
  setLogCount: number;
  completedAt: string | null;
};

export function WorkoutLogsPanel({
  rows,
  date,
  classId,
  classes,
}: {
  rows: WorkoutLogRow[];
  date: string;
  classId: string;
  classes: { id: string; name: string; period: string | null }[];
}) {
  const exportParams = new URLSearchParams({ date });
  if (classId) exportParams.set("classId", classId);
  const exportHref = `/api/workouts/logs/export?${exportParams.toString()}`;

  return (
    <div className="space-y-4">
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          Workout date
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="mt-1 block rounded-lg border border-card-border bg-background px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Class
          <select
            name="classId"
            defaultValue={classId}
            className="mt-1 block rounded-lg border border-card-border bg-background px-3 py-2"
          >
            <option value="">All sections</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.period ? `${c.period} — ${c.name}` : c.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium"
        >
          Filter
        </button>
        <a
          href={exportHref}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background"
        >
          Download CSV
        </a>
      </form>

      <p className="text-sm text-muted">
        Export includes every athlete in the roster for the selected date, all set logs, and submission
        status. Open a row to enter or submit logs on behalf of an athlete.
      </p>

      <div className="overflow-x-auto rounded-xl border border-card-border">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-card/80 text-muted">
            <tr>
              <th className="px-3 py-2">Athlete</th>
              <th className="px-3 py-2">Program</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Sets logged</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted">
                  No assignments for this date{classId ? " and class" : ""}.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={`${r.studentId}-${r.programName}`} className="border-t border-card-border/60">
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.studentName}</div>
                    <div className="text-xs text-muted">#{r.studentNumber}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div>{r.programName}</div>
                    {r.className && <div className="text-xs text-muted">{r.className}</div>}
                  </td>
                  <td className="px-3 py-2">{r.status.replace("_", " ")}</td>
                  <td className="px-3 py-2">{r.setLogCount}</td>
                  <td className="px-3 py-2 text-right">
                    {r.sessionId ? (
                      <Link
                        href={`/coach/programs/session/${r.sessionId}`}
                        className="text-accent hover:underline"
                      >
                        Open
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
