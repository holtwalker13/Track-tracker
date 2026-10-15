"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AttendanceStudent } from "@/lib/queries/attendance";

export function ClassAttendancePanel({
  classId,
  date,
  subgroupId,
}: {
  classId: string;
  date: string;
  subgroupId?: string | null;
}) {
  const router = useRouter();
  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | "all" | null>(null);

  async function load() {
    setError(null);
    const params = new URLSearchParams({ classId, date });
    if (subgroupId) params.set("subgroupId", subgroupId);
    const res = await fetch(`/api/attendance?${params.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not load attendance");
      setLoading(false);
      return;
    }
    setStudents(data.students ?? []);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when the day/class scope changes
  }, [classId, date, subgroupId]);

  const presentCount = useMemo(
    () => students.filter((s) => s.present === true).length,
    [students]
  );

  async function setPresent(studentId: string, present: boolean) {
    const prev = students;
    setStudents((rows) => rows.map((row) => (row.id === studentId ? { ...row, present } : row)));
    setPendingId(studentId);
    setError(null);
    const res = await fetch("/api/attendance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, date, studentId, present }),
    });
    const data = await res.json().catch(() => ({}));
    setPendingId(null);
    if (!res.ok) {
      setStudents(prev);
      setError(data.error ?? "Could not save attendance");
      return;
    }
    router.refresh();
  }

  async function markAll(present: boolean) {
    const prev = students;
    setStudents((rows) => rows.map((row) => ({ ...row, present })));
    setPendingId("all");
    setError(null);
    const res = await fetch("/api/attendance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, date, present, subgroupId: subgroupId || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setPendingId(null);
    if (!res.ok) {
      setStudents(prev);
      setError(data.error ?? "Could not save attendance");
      return;
    }
    router.refresh();
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading roster…</p>;
  }

  if (students.length === 0) {
    return <p className="text-sm text-muted">No students in this class yet.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {presentCount} of {students.length} present
          <span className="ml-2 text-[11px] uppercase tracking-wide">Autosaves</span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pendingId !== null}
            onClick={() => void markAll(true)}
            className="rounded-lg border border-emerald-400/30 px-2.5 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-50"
          >
            All here
          </button>
          <button
            type="button"
            disabled={pendingId !== null}
            onClick={() => void markAll(false)}
            className="rounded-lg border border-card-border px-2.5 py-1 text-xs font-medium text-muted hover:text-foreground disabled:opacity-50"
          >
            All out
          </button>
        </div>
      </div>
      {error ? <p className="text-sm text-sport-red">{error}</p> : null}
      <ul className="max-h-[min(28rem,60vh)] space-y-1 overflow-y-auto pr-1">
        {students.map((student) => {
          const checked = student.present === true;
          return (
            <li key={student.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition",
                  checked
                    ? "border-emerald-400/40 bg-emerald-500/10"
                    : "border-card-border bg-background/40 hover:border-card-border/80"
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={pendingId !== null}
                  onChange={(e) => void setPresent(student.id, e.target.checked)}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                    checked
                      ? "border-emerald-400 bg-emerald-500 text-background"
                      : "border-card-border bg-background text-transparent"
                  )}
                >
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium">
                  {student.lastName}, {student.firstName}
                  {student.provisional ? (
                    <span className="ml-2 text-[10px] font-semibold uppercase text-amber-200">
                      Temp
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
