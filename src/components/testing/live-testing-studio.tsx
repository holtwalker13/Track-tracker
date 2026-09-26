"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Trophy,
} from "lucide-react";
import { ActivityIcon } from "@/lib/activity-icons";
import { fireConfetti } from "@/lib/confetti";
import { formatActivityValue } from "@/lib/format";
import { pickBestAttempt } from "@/lib/services/performance";
import { formatStudentName, cn } from "@/lib/utils";
import type { ScoringDirection } from "@/lib/constants";

export type StudioActivity = {
  id: string;
  slug: string;
  name: string;
  unit: string;
  categorySlug: string;
};

export type StudioRow = {
  studentId: string;
  firstName: string;
  lastName: string;
  previousBest: number | null;
  attempts: (string | number)[];
  status: string;
  saved?: boolean;
  pr?: boolean;
  celebrateLabel?: string | null;
  boardHits?: { period: string; rank: number; total: number }[];
};

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export function LiveTestingStudio({
  sessionId,
  sessionPath,
  activities,
  activitySlug,
  activityId,
  activityName,
  activityUnit,
  scoringDirection = "HIGHER_BETTER",
  rows: initialRows,
  readOnly = false,
  selectedStudentId: initialStudentId,
}: {
  sessionId: string;
  sessionPath: string;
  activities: StudioActivity[];
  activitySlug: string;
  activityId: string;
  activityName: string;
  activityUnit: string;
  scoringDirection?: "HIGHER_BETTER" | "LOWER_BETTER";
  rows: StudioRow[];
  readOnly?: boolean;
  selectedStudentId?: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const activityIdRef = useRef(activityId);
  const generationRef = useRef(0);
  const skipBlurRef = useRef(false);
  const inputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  /** Prevents confetti spam when re-saving the same (or worse) best. */
  const lastCelebratedKeyRef = useRef<string | null>(null);

  const studentId =
    initialStudentId && rows.some((r) => r.studentId === initialStudentId)
      ? initialStudentId
      : rows[0]?.studentId;

  const studentIndex = rows.findIndex((r) => r.studentId === studentId);
  const row = studentIndex >= 0 ? rows[studentIndex]! : null;

  const activityIndex = activities.findIndex((a) => a.slug === activitySlug);
  const nextActivity = activities[activityIndex + 1] ?? null;
  const prevActivity = activities[activityIndex - 1] ?? null;

  useEffect(() => {
    generationRef.current += 1;
    activityIdRef.current = activityId;
    setRows(initialRows);
    setBanner(null);
    lastCelebratedKeyRef.current = null;
  }, [activityId, initialRows]);

  const saveRow = useCallback(
    async (target: StudioRow) => {
      if (readOnly) return null;
      const attempts = target.attempts.map((a) =>
        a === "" || a === null ? null : Number(a)
      );
      const hasValue = attempts.some((a) => a != null && !Number.isNaN(a));
      if (!hasValue && target.status === "COMPLETED") return null;

      const gen = generationRef.current;
      const aid = activityIdRef.current;
      setSaving(true);
      const res = await fetch("/api/testing/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: target.studentId,
          activityId: aid,
          testingSessionId: sessionId,
          attempts,
          status: target.status === "COMPLETED" ? undefined : target.status,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setSaving(false);
      if (gen !== generationRef.current || aid !== activityIdRef.current) return null;

      setRows((prev) =>
        prev.map((r) =>
          r.studentId === target.studentId
            ? {
                ...r,
                saved: Boolean(data.saved),
                pr: Boolean(data.pr),
                celebrateLabel: data.celebrateLabel ?? null,
                boardHits: data.boardHits ?? [],
              }
            : r
        )
      );

      if (data.celebrate && data.celebrateLabel && data.best != null) {
        const key = `${target.studentId}:${aid}:${data.best}`;
        if (lastCelebratedKeyRef.current !== key) {
          lastCelebratedKeyRef.current = key;
          setBanner(data.celebrateLabel);
          fireConfetti();
          window.setTimeout(() => setBanner(null), 3200);
        }
      }
      return data;
    },
    [readOnly, sessionId]
  );

  function updateAttempt(idx: number, value: string) {
    if (!row) return;
    setRows((prev) =>
      prev.map((r) => {
        if (r.studentId !== row.studentId) return r;
        const attempts = [...r.attempts];
        attempts[idx] = value;
        return { ...r, attempts, saved: false, celebrateLabel: null };
      })
    );
  }

  function selectStudent(id: string) {
    const params = new URLSearchParams();
    params.set("activity", activitySlug);
    params.set("student", id);
    router.push(`${sessionPath}?${params.toString()}`);
  }

  function goStudent(delta: number) {
    const next = rows[studentIndex + delta];
    if (next) selectStudent(next.studentId);
  }

  function goActivity(slug: string) {
    const params = new URLSearchParams();
    params.set("activity", slug);
    if (studentId) params.set("student", studentId);
    router.push(`${sessionPath}?${params.toString()}`);
  }

  async function commitAttempt(idx: number, value: string, advance: boolean) {
    if (!row) return;
    const nextRow: StudioRow = {
      ...row,
      attempts: row.attempts.map((a, i) => (i === idx ? value : a)),
    };
    setRows((prev) =>
      prev.map((r) => (r.studentId === row.studentId ? { ...nextRow, saved: false } : r))
    );
    await saveRow(nextRow);
    if (!advance) return;
    if (idx < 2) {
      const el = inputRefs.current.get(idx + 1);
      el?.focus();
      el?.select();
    } else {
      const next = rows[studentIndex + 1];
      if (next) selectStudent(next.studentId);
    }
  }

  const attemptLabels = useMemo(() => ["Attempt 1", "Attempt 2", "Attempt 3"], []);

  if (!row) {
    return (
      <p className="rounded-xl border border-card-border bg-card p-6 text-center text-sm text-muted">
        No athletes in this session yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {banner && (
        <div className="animate-in fade-in zoom-in-95 flex items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm font-bold text-emerald-300">
          <Trophy className="h-5 w-5 text-sport-gold" />
          {banner}
        </div>
      )}

      <p className="text-sm text-muted">
        Select an athlete and start tracking live. Results save automatically.
      </p>

      {/* Athlete carousel */}
      <div
        className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="listbox"
        aria-label="Athletes"
      >
        {rows.map((r) => {
          const active = r.studentId === row.studentId;
          const done = Boolean(r.saved) && r.status === "COMPLETED";
          return (
            <button
              key={r.studentId}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => selectStudent(r.studentId)}
              className={cn(
                "flex w-[7.5rem] shrink-0 snap-start flex-col items-center gap-1.5 rounded-2xl border px-2 py-2.5 text-center transition",
                active
                  ? "border-sky-400 bg-sky-400/10 ring-1 ring-sky-400/40"
                  : "border-card-border bg-card/70 hover:border-sky-400/30"
              )}
            >
              <span
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold",
                  active ? "bg-sky-500 text-white" : "bg-background text-muted"
                )}
              >
                {initials(r.firstName, r.lastName)}
              </span>
              <span className="w-full truncate text-xs font-semibold leading-tight">
                {formatStudentName(r.firstName, r.lastName, true)}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    active ? "bg-emerald-400" : done ? "bg-sky-400" : "bg-muted"
                  )}
                />
                {active ? "Testing" : done ? "Logged" : "Pending"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Exercise sequence */}
      <div
        className="flex snap-x gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Test sequence"
      >
        {activities.map((a, i) => {
          const active = a.slug === activitySlug;
          return (
            <Link
              key={a.id}
              role="tab"
              aria-selected={active}
              href={`${sessionPath}?activity=${a.slug}${studentId ? `&student=${studentId}` : ""}`}
              className={cn(
                "inline-flex shrink-0 snap-start items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold",
                active
                  ? "border-sky-800 bg-sky-800 text-white shadow-sm"
                  : "border-card-border bg-card font-medium text-muted hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                  active ? "bg-white/25 text-white" : "bg-background"
                )}
              >
                {i + 1}
              </span>
              <ActivityIcon
                slug={a.slug}
                categorySlug={a.categorySlug}
                tone={active ? "inherit" : "default"}
                className={cn("h-3.5 w-3.5", active && "text-white")}
              />
              <span className="max-w-[8rem] truncate sm:max-w-none">{a.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Focused dark entry panel */}
      <section className="overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0f172a] text-slate-100 shadow-xl shadow-black/30">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              disabled={studentIndex <= 0}
              onClick={() => goStudent(-1)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-30"
              aria-label="Previous athlete"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500 text-sm font-bold text-white"
              aria-hidden
            >
              {initials(row.firstName, row.lastName)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold leading-tight">
                {row.firstName} {row.lastName}
              </p>
              <p className="text-[11px] text-slate-400">
                {activityName} · 3 attempts
              </p>
            </div>
            <button
              type="button"
              disabled={studentIndex >= rows.length - 1}
              onClick={() => goStudent(1)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-30"
              aria-label="Next athlete"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          {saving ? <span className="text-xs text-slate-400">Saving…</span> : null}
        </div>

        <div className="grid gap-3 border-b border-white/10 px-3 py-3 sm:grid-cols-2 sm:px-4">
          <div className="rounded-xl bg-white/5 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Previous best
            </p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">
              {row.previousBest != null
                ? formatActivityValue(row.previousBest, activityUnit, activitySlug)
                : "—"}
            </p>
          </div>
          <div className="rounded-xl bg-white/5 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Status
            </p>
            <p className="mt-0.5 text-sm font-semibold">
              {row.pr || row.celebrateLabel ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-300">
                  <Trophy className="h-4 w-4 text-sport-gold" />
                  {row.celebrateLabel ?? "New Record!"}
                </span>
              ) : row.saved ? (
                <span className="text-sky-300">Saved</span>
              ) : (
                <span className="text-slate-400">Ready to log</span>
              )}
            </p>
          </div>
        </div>

        <div className="space-y-3 px-3 py-4 sm:px-4">
          <div className="grid grid-cols-3 gap-2">
            {(() => {
              const nums = row.attempts
                .map((a) => (a === "" || a == null ? null : Number(a)))
                .filter((n): n is number => n != null && !Number.isNaN(n));
              const sessionBest = pickBestAttempt(
                nums,
                scoringDirection as ScoringDirection
              );
              const recordAttemptIdx =
                row.pr && sessionBest != null
                  ? row.attempts.findIndex((a) => {
                      const n = a === "" || a == null ? null : Number(a);
                      return n != null && !Number.isNaN(n) && n === sessionBest;
                    })
                  : -1;

              return [0, 1, 2].map((i) => {
                const val = row.attempts[i] ?? "";
                const num = val === "" ? null : Number(val);
                // Only the single best attempt of this session earns the trophy —
                // worse attempts must not show "New Record!".
                const isRecord = recordAttemptIdx === i;
                const filled = val !== "" && !Number.isNaN(Number(val));
                return (
                <div key={i} className="min-w-0">
                  <label className="mb-1 block text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {attemptLabels[i]}
                  </label>
                  <input
                    ref={(el) => {
                      if (el) inputRefs.current.set(i, el);
                      else inputRefs.current.delete(i);
                    }}
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.]?[0-9]*"
                    enterKeyHint={i < 2 ? "next" : "done"}
                    autoComplete="off"
                    disabled={readOnly}
                    value={val}
                    onChange={(e) => updateAttempt(i, e.target.value)}
                    onFocus={(e) => {
                      requestAnimationFrame(() =>
                        e.target.scrollIntoView({ block: "center", behavior: "smooth" })
                      );
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        skipBlurRef.current = true;
                        void commitAttempt(i, (e.target as HTMLInputElement).value, true).finally(
                          () => {
                            skipBlurRef.current = false;
                          }
                        );
                      }
                    }}
                    onBlur={(e) => {
                      if (skipBlurRef.current) return;
                      void commitAttempt(i, e.target.value, false);
                    }}
                    className={cn(
                      "w-full rounded-xl border bg-white px-2 py-3 text-center text-xl font-bold tabular-nums text-slate-900 outline-none",
                      "focus:ring-2 focus:ring-sky-400 disabled:opacity-60",
                      isRecord
                        ? "border-emerald-400 ring-2 ring-emerald-300/60 bg-emerald-50"
                        : filled
                          ? "border-emerald-300"
                          : "border-slate-200"
                    )}
                  />
                  <div className="mt-1.5 flex min-h-[1.25rem] items-center justify-center">
                    {isRecord ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300">
                        <Trophy className="h-3 w-3 text-sport-gold" />
                        New Record!
                      </span>
                    ) : filled ? (
                      <Check className="h-4 w-4 text-emerald-400" strokeWidth={2.5} />
                    ) : null}
                  </div>
                </div>
                );
              });
            })()}
          </div>

          {row.boardHits && row.boardHits.some((h) => h.rank <= 3 && h.total >= 2) ? (
            <div className="flex flex-wrap gap-1.5">
              {row.boardHits
                .filter((h) => h.rank <= 3 && h.total >= 2)
                .map((h) => (
                  <span
                    key={h.period}
                    className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300"
                  >
                    #{h.rank} {h.period}
                  </span>
                ))}
            </div>
          ) : null}

          <div className="flex items-center gap-2 pt-1">
            <select
              disabled={readOnly}
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 disabled:opacity-60"
              value={row.status}
              onChange={(e) => {
                const status = e.target.value;
                const next = { ...row, status };
                setRows((prev) =>
                  prev.map((r) => (r.studentId === row.studentId ? next : r))
                );
                void saveRow(next);
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
                className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-sky-500 px-4 font-semibold text-white"
                onMouseDown={(e) => {
                  e.preventDefault();
                  skipBlurRef.current = true;
                }}
                onClick={() => {
                  void saveRow(row).finally(() => {
                    skipBlurRef.current = false;
                  });
                  goStudent(1);
                }}
              >
                <Check className="h-5 w-5" strokeWidth={2.5} />
                Next
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-white/10 bg-black/20 px-3 py-3 sm:px-4">
          <button
            type="button"
            disabled={!prevActivity}
            onClick={() => prevActivity && goActivity(prevActivity.slug)}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 disabled:opacity-30"
            aria-label="Previous exercise"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            disabled={!nextActivity}
            onClick={() => nextActivity && goActivity(nextActivity.slug)}
            className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {nextActivity ? (
              <>
                Next exercise:{" "}
                <span className="truncate">{nextActivity.name}</span>
              </>
            ) : (
              "Last exercise"
            )}
          </button>
          <button
            type="button"
            disabled={!nextActivity}
            onClick={() => nextActivity && goActivity(nextActivity.slug)}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 disabled:opacity-30"
            aria-label="Next exercise"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      {readOnly && (
        <p className="text-center text-sm text-sport-gold">
          Recording paused or closed — view only.
        </p>
      )}
    </div>
  );
}
