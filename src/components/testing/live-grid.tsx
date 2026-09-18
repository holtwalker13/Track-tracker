"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatActivityValue } from "@/lib/format";
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
  activitySlug,
  activityUnit,
  subtitle,
  rows: initialRows,
  readOnly = false,
}: {
  sessionId: string;
  activityId: string;
  activityName: string;
  activitySlug?: string;
  activityUnit?: string;
  subtitle: string;
  rows: Row[];
  readOnly?: boolean;
}) {
  const [rows, setRows] = useState(initialRows);
  const [saving, setSaving] = useState<string | null>(null);
  const activityIdRef = useRef(activityId);
  const generationRef = useRef(0);

  // Wipe / reload whenever the activity tab changes so marks never carry over.
  useEffect(() => {
    generationRef.current += 1;
    activityIdRef.current = activityId;
    setRows(initialRows);
  }, [activityId, initialRows]);

  const saveRow = useCallback(
    async (
      studentId: string,
      row: Row,
      saveActivityId: string,
      generation: number
    ) => {
      if (readOnly) return;
      // Drop blur/saves that fired after the coach switched events.
      if (generation !== generationRef.current) return;
      if (saveActivityId !== activityIdRef.current) return;

      const attempts = row.attempts.map((a) =>
        a === "" || a === null ? null : Number(a)
      );
      const hasValue = attempts.some((a) => a != null && !Number.isNaN(a));
      const nonComplete = row.status !== "COMPLETED";
      if (!hasValue && !nonComplete) return;

      setSaving(studentId);
      const res = await fetch("/api/testing/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          activityId: saveActivityId,
          testingSessionId: sessionId,
          attempts,
          status: row.status === "COMPLETED" ? undefined : row.status,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (generation !== generationRef.current) return;
      if (saveActivityId !== activityIdRef.current) return;
      setRows((prev) =>
        prev.map((r) =>
          r.studentId === studentId
            ? { ...r, saved: Boolean(data.saved), pr: Boolean(data.pr) }
            : r
        )
      );
      setSaving(null);
    },
    [sessionId, readOnly]
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
        {readOnly && (
          <p className="mt-1 text-sm text-sport-gold">Recording paused or closed — view only.</p>
        )}
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
              key={`${activityId}-${row.studentId}`}
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
                {row.previousBest != null && activityUnit
                  ? formatActivityValue(row.previousBest, activityUnit, activitySlug)
                  : (row.previousBest ?? "—")}
              </td>
              {[0, 1, 2].map((i) => (
                <td key={i} className="px-1 py-2">
                  <input
                    inputMode="decimal"
                    disabled={readOnly}
                    data-activity-id={activityId}
                    className="w-20 rounded-lg border border-card-border bg-background px-2 py-3 text-center text-lg font-semibold disabled:opacity-60"
                    value={row.attempts[i] ?? ""}
                    onChange={(e) => updateAttempt(row.studentId, i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const aid =
                          (e.currentTarget as HTMLInputElement).dataset.activityId ??
                          activityId;
                        const gen = generationRef.current;
                        saveRow(
                          row.studentId,
                          {
                            ...row,
                            attempts: row.attempts.map((a, idx) =>
                              idx === i ? (e.target as HTMLInputElement).value : a
                            ),
                          },
                          aid,
                          gen
                        );
                      }
                    }}
                    onBlur={(e) => {
                      const aid = e.currentTarget.dataset.activityId ?? activityId;
                      const gen = generationRef.current;
                      saveRow(
                        row.studentId,
                        {
                          ...row,
                          attempts: row.attempts.map((a, idx) =>
                            idx === i ? e.target.value : a
                          ),
                        },
                        aid,
                        gen
                      );
                    }}
                  />
                </td>
              ))}
              <td className="px-2">
                <select
                  disabled={readOnly}
                  data-activity-id={activityId}
                  className="rounded border border-card-border bg-background px-2 py-2 text-sm disabled:opacity-60"
                  value={row.status}
                  onChange={(e) => {
                    const status = e.target.value;
                    const next = { ...row, status };
                    setRows((prev) =>
                      prev.map((r) =>
                        r.studentId === row.studentId ? next : r
                      )
                    );
                    const aid = e.currentTarget.dataset.activityId ?? activityId;
                    saveRow(row.studentId, next, aid, generationRef.current);
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
