"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { formatActivityValue } from "@/lib/format";
import { formatStudentName } from "@/lib/utils";
import { cn } from "@/lib/utils";

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

function inputKey(studentId: string, attemptIdx: number) {
  return `${studentId}:${attemptIdx}`;
}

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
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const skipBlurRef = useRef(false);

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
      const saved = res.ok && Boolean(data.saved);
      setRows((prev) =>
        prev.map((r) =>
          r.studentId === studentId
            ? { ...r, saved, pr: saved && Boolean(data.pr) }
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

  function focusNext(studentId: string, attemptIdx: number) {
    const studentIndex = rows.findIndex((r) => r.studentId === studentId);
    if (studentIndex < 0) return;

    let nextStudent = studentIndex;
    let nextAttempt = attemptIdx + 1;
    if (nextAttempt > 2) {
      nextAttempt = 0;
      nextStudent = studentIndex + 1;
    }
    if (nextStudent >= rows.length) return;

    const nextId = rows[nextStudent]!.studentId;
    const el = inputRefs.current.get(inputKey(nextId, nextAttempt));
    if (el && !el.disabled) {
      el.focus();
      el.select();
    }
  }

  async function commitAndAdvance(
    studentId: string,
    attemptIdx: number,
    value: string,
    advance: boolean
  ) {
    const row = rows.find((r) => r.studentId === studentId);
    if (!row) return;
    const nextRow: Row = {
      ...row,
      attempts: row.attempts.map((a, idx) => (idx === attemptIdx ? value : a)),
    };
    // Optimistic local update so save uses latest value
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...nextRow, saved: false } : r))
    );
    await saveRow(studentId, nextRow, activityId, generationRef.current);
    if (advance) focusNext(studentId, attemptIdx);
  }

  function renderAttemptInput(
    row: Row,
    i: number,
    opts?: { large?: boolean; showCheck?: boolean }
  ) {
    const key = inputKey(row.studentId, i);
    return (
      <div key={i} className="flex min-w-0 flex-1 items-center gap-1">
        <label className="sr-only">
          Attempt {i + 1} for {row.firstName}
        </label>
        <input
          ref={(el) => {
            if (el) inputRefs.current.set(key, el);
            else inputRefs.current.delete(key);
          }}
          type="text"
          inputMode="decimal"
          pattern="[0-9]*[.]?[0-9]*"
          enterKeyHint={i < 2 ? "next" : "done"}
          autoComplete="off"
          disabled={readOnly}
          data-activity-id={activityId}
          data-student-id={row.studentId}
          data-attempt={i}
          className={cn(
            "min-w-0 flex-1 rounded-lg border border-card-border bg-background text-center font-semibold tabular-nums disabled:opacity-60",
            "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30",
            opts?.large
              ? "px-2 py-3 text-xl"
              : "w-20 px-2 py-3 text-lg"
          )}
          value={row.attempts[i] ?? ""}
          onChange={(e) => updateAttempt(row.studentId, i, e.target.value)}
          onFocus={(e) => {
            // Keep the active attempt above the mobile keyboard.
            requestAnimationFrame(() => {
              e.target.scrollIntoView({ block: "center", behavior: "smooth" });
            });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              skipBlurRef.current = true;
              const value = (e.target as HTMLInputElement).value;
              void commitAndAdvance(row.studentId, i, value, true).finally(() => {
                skipBlurRef.current = false;
              });
            }
          }}
          onBlur={(e) => {
            if (skipBlurRef.current) return;
            const value = e.target.value;
            void commitAndAdvance(row.studentId, i, value, false);
          }}
        />
        {opts?.showCheck && !readOnly ? (
          <button
            type="button"
            aria-label={`Save attempt ${i + 1} and go to next`}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-background"
            onMouseDown={(e) => {
              e.preventDefault();
              skipBlurRef.current = true;
            }}
            onClick={() => {
              const el = inputRefs.current.get(key);
              void commitAndAdvance(row.studentId, i, el?.value ?? "", true).finally(() => {
                skipBlurRef.current = false;
              });
            }}
          >
            <Check className="h-5 w-5" strokeWidth={2.5} />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 sm:mb-4">
        <h2 className="text-lg font-bold sm:text-2xl">{activityName}</h2>
        <p className="text-xs text-muted sm:text-sm">{subtitle}</p>
        {readOnly && (
          <p className="mt-1 text-sm text-sport-gold">Recording paused or closed — view only.</p>
        )}
      </div>

      {/* Mobile: stacked athlete cards — name then attempts */}
      <ul className="space-y-2 pb-[40vh] md:hidden md:pb-0">
        {rows.map((row) => (
          <li
            key={`${activityId}-${row.studentId}`}
            className={cn(
              "rounded-xl border border-card-border bg-card p-2.5",
              row.pr && "border-success/40 bg-success/5"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold leading-tight">
                  {formatStudentName(row.firstName, row.lastName, true)}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  Prev{" "}
                  {row.previousBest != null && activityUnit
                    ? formatActivityValue(row.previousBest, activityUnit, activitySlug)
                    : (row.previousBest ?? "—")}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                {row.pr && (
                  <span className="rounded bg-success/20 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                    NEW PR
                  </span>
                )}
                {row.saved && (
                  <span className="text-[10px] font-medium text-accent">Saved</span>
                )}
                {saving === row.studentId && (
                  <span className="text-[10px] text-muted">…</span>
                )}
              </div>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-center text-[10px] font-medium uppercase tracking-wide text-muted">
                    A{i + 1}
                  </span>
                  {renderAttemptInput(row, i, { large: true })}
                </div>
              ))}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <select
                disabled={readOnly}
                data-activity-id={activityId}
                className="min-w-0 flex-1 rounded-lg border border-card-border bg-background px-2 py-2 text-sm disabled:opacity-60"
                value={row.status}
                onChange={(e) => {
                  const status = e.target.value;
                  const next = { ...row, status };
                  setRows((prev) =>
                    prev.map((r) => (r.studentId === row.studentId ? next : r))
                  );
                  const aid = e.currentTarget.dataset.activityId ?? activityId;
                  void saveRow(row.studentId, next, aid, generationRef.current);
                }}
              >
                <option value="COMPLETED">Active</option>
                <option value="ABSENT">Absent</option>
                <option value="INJURED">Injured</option>
                <option value="DNP">Did not participate</option>
                <option value="DQ">Disqualified</option>
              </select>
              {!readOnly ? (
                <button
                  type="button"
                  aria-label="Save marks and go to next athlete"
                  className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 font-semibold text-background"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    skipBlurRef.current = true;
                  }}
                  onClick={() => {
                    void saveRow(row.studentId, row, activityId, generationRef.current).finally(
                      () => {
                        skipBlurRef.current = false;
                      }
                    );
                    // Jump to next athlete attempt 1
                    const idx = rows.findIndex((r) => r.studentId === row.studentId);
                    const next = rows[idx + 1];
                    if (next) {
                      const el = inputRefs.current.get(inputKey(next.studentId, 0));
                      el?.focus();
                      el?.select();
                    }
                  }}
                >
                  <Check className="h-5 w-5" strokeWidth={2.5} />
                  <span className="text-sm">Next</span>
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
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
                className={cn(
                  "border-b border-card-border/60",
                  row.pr && "bg-success/10"
                )}
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
                    {renderAttemptInput(row, i)}
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
                      void saveRow(row.studentId, next, aid, generationRef.current);
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
    </div>
  );
}
