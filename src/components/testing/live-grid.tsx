"use client";

import { useCallback, useState } from "react";
import { formatStudentName } from "@/lib/utils";

type Row = {
  studentId: string;
  firstName: string;
  lastName: string;
  previousBest: number | null;
  attempts: (string | number)[];
  status: string;
  saved?: boolean;
  pr?: boolean;
};

export function LiveTestingGrid({
  sessionId,
  activityId,
  activityName,
  subtitle,
  rows: initialRows,
}: {
  sessionId: string;
  activityId: string;
  activityName: string;
  subtitle: string;
  rows: Row[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [saving, setSaving] = useState<string | null>(null);

  const saveRow = useCallback(
    async (studentId: string, row: Row) => {
      setSaving(studentId);
      const attempts = row.attempts.map((a) =>
        a === "" || a === null ? null : Number(a)
      );
      const res = await fetch("/api/testing/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          activityId,
          testingSessionId: sessionId,
          attempts,
          status: row.status === "COMPLETED" ? undefined : row.status,
        }),
      });
      const data = await res.json();
      setRows((prev) =>
        prev.map((r) =>
          r.studentId === studentId
            ? { ...r, saved: data.saved, pr: data.pr }
            : r
        )
      );
      setSaving(null);
    },
    [activityId, sessionId]
  );

  function updateAttempt(studentId: string, idx: number, value: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.studentId !== studentId) return r;
        const attempts = [...r.attempts];
        attempts[idx] = value;
        return { ...r, attempts, saved: false };
      })
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">{activityName}</h2>
        <p className="text-muted">{subtitle}</p>
      </div>
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-card-border text-xs uppercase text-muted">
            <th className="py-3 pr-2">Student</th>
            <th className="px-2">Prev best</th>
            <th className="px-2">Attempt 1</th>
            <th className="px-2">Attempt 2</th>
            <th className="px-2">Attempt 3</th>
            <th className="px-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.studentId}
              className={`border-b border-card-border/60 ${row.pr ? "bg-success/10" : ""}`}
            >
              <td className="py-3 pr-2 font-medium">
                {formatStudentName(row.firstName, row.lastName, true)}
                {row.pr && (
                  <span className="ml-2 rounded bg-success/20 px-2 py-0.5 text-xs text-success">
                    NEW PR
                  </span>
                )}
                {row.saved && (
                  <span className="ml-2 text-xs text-accent">Saved</span>
                )}
              </td>
              <td className="px-2 text-muted">
                {row.previousBest ?? "—"}
              </td>
              {[0, 1, 2].map((i) => (
                <td key={i} className="px-1 py-2">
                  <input
                    inputMode="decimal"
                    className="w-20 rounded-lg border border-card-border bg-background px-2 py-3 text-center text-lg font-semibold"
                    value={row.attempts[i] ?? ""}
                    onChange={(e) => updateAttempt(row.studentId, i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveRow(row.studentId, row);
                      }
                    }}
                    onBlur={() => saveRow(row.studentId, row)}
                  />
                </td>
              ))}
              <td className="px-2">
                <select
                  className="rounded border border-card-border bg-background px-2 py-2 text-sm"
                  value={row.status}
                  onChange={(e) => {
                    const status = e.target.value;
                    setRows((prev) =>
                      prev.map((r) =>
                        r.studentId === row.studentId ? { ...r, status } : r
                      )
                    );
                    saveRow(row.studentId, { ...row, status });
                  }}
                >
                  <option value="COMPLETED">Active</option>
                  <option value="ABSENT">Absent</option>
                  <option value="INJURED">Injured</option>
                  <option value="DNP">Did not participate</option>
                  <option value="DQ">Disqualified</option>
                </select>
                {saving === row.studentId && (
                  <span className="ml-2 text-xs text-muted">…</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
