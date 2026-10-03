"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { addDays, format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import {
  type CalendarAssignment,
  weekStartSunday,
} from "@/lib/queries/programs-hub";
import { cn } from "@/lib/utils";
import { todayDateString } from "@/lib/services/workouts";
import { CoachModal } from "@/components/ui/coach-modal";

/** Desktop/tablet: Mon–Fri window. Mobile: 3 days with today centered. */
const DESKTOP_VISIBLE_DAYS = 5;
const MOBILE_VISIBLE_DAYS = 3;
/** Monday index within a Sun–Sat week. */
const MONDAY_OFFSET = 1;
const MOBILE_MQ = "(max-width: 639px)";

type TemplateOption = { id: string; name: string };

export function ProgramsWeekCalendar({
  weekStart,
  weeks,
  assignments: initialAssignments,
  selectedDate,
  classId,
  subgroupId,
  subgroupName,
  templates,
}: {
  weekStart: string;
  weeks: number;
  assignments: CalendarAssignment[];
  selectedDate: string;
  classId: string;
  subgroupId?: string | null;
  subgroupName?: string | null;
  templates: TemplateOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [assignments, setAssignments] = useState(initialAssignments);
  // Mobile-first until matchMedia runs (avoids a wide flash on phones).
  const [visibleDays, setVisibleDays] = useState(MOBILE_VISIBLE_DAYS);

  const [addDate, setAddDate] = useState<string | null>(null);
  const [addTemplateId, setAddTemplateId] = useState(templates[0]?.id ?? "");
  const [editing, setEditing] = useState<CalendarAssignment | null>(null);
  const [editTemplateId, setEditTemplateId] = useState("");
  const [editDate, setEditDate] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  useEffect(() => {
    setAssignments(initialAssignments);
  }, [initialAssignments]);

  useEffect(() => {
    if (!addTemplateId && templates[0]) setAddTemplateId(templates[0].id);
  }, [templates, addTemplateId]);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const apply = () =>
      setVisibleDays(mq.matches ? MOBILE_VISIBLE_DAYS : DESKTOP_VISIBLE_DAYS);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const byDate = new Map<string, CalendarAssignment[]>();
  for (const a of assignments) {
    const list = byDate.get(a.date) ?? [];
    list.push(a);
    byDate.set(a.date, list);
  }

  const days = Array.from({ length: weeks * 7 }, (_, i) =>
    format(addDays(parseISO(weekStart), i), "yyyy-MM-dd")
  );

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const dayList = Array.from({ length: weeks * 7 }, (_, i) =>
      format(addDays(parseISO(weekStart), i), "yyyy-MM-dd")
    );

    function scrollIntoViewWindow() {
      if (!el) return;
      const dayWidth = el.clientWidth / visibleDays;
      const today = todayDateString();
      const todayIndex = dayList.indexOf(today);

      if (visibleDays === MOBILE_VISIBLE_DAYS) {
        // Center today (or selected day if today isn't in range).
        const focus =
          todayIndex >= 0 ? todayIndex : Math.max(0, dayList.indexOf(selectedDate));
        const maxStart = Math.max(0, dayList.length - visibleDays);
        const startIndex = Math.min(maxStart, Math.max(0, focus - 1));
        el.scrollLeft = startIndex * dayWidth;
        return;
      }

      // Desktop: Mon–Fri window for the first week.
      el.scrollLeft = MONDAY_OFFSET * dayWidth;
    }

    scrollIntoViewWindow();
    const ro = new ResizeObserver(scrollIntoViewWindow);
    ro.observe(el);
    return () => ro.disconnect();
  }, [weekStart, weeks, visibleDays, selectedDate]);

  function setParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === "") params.delete(k);
      else params.set(k, v);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function shiftWeek(delta: number) {
    const next = format(addDays(parseISO(weekStart), delta * 7), "yyyy-MM-dd");
    setParams({ week: next });
  }

  function openAdd(date: string) {
    setActionError(null);
    setAddDate(date);
    setAddTemplateId(templates[0]?.id ?? "");
    setParams({ date, logView: "day" });
  }

  function openEdit(a: CalendarAssignment) {
    setActionError(null);
    setEditing(a);
    setEditTemplateId(a.templateId);
    setEditDate(a.date);
    setParams({ date: a.date, logView: "day" });
  }

  async function addWorkout() {
    if (!addDate || !addTemplateId || !classId) {
      setActionError("Pick a workout and class first.");
      return;
    }
    setActionPending(true);
    setActionError(null);
    const res = await fetch("/api/workouts/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: addTemplateId,
        classId,
        subgroupId: subgroupId || undefined,
        scheduledDate: addDate,
      }),
    });
    const data = await res.json();
    setActionPending(false);
    if (!res.ok) {
      setActionError(data.error ?? "Could not add workout");
      return;
    }
    setAddDate(null);
    startTransition(() => router.refresh());
  }

  async function saveEdit() {
    if (!editing) return;
    setActionPending(true);
    setActionError(null);
    const res = await fetch(`/api/workouts/assignments/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: editTemplateId,
        scheduledDate: editDate,
      }),
    });
    const data = await res.json();
    setActionPending(false);
    if (!res.ok) {
      setActionError(data.error ?? "Could not update workout");
      return;
    }
    setEditing(null);
    startTransition(() => router.refresh());
  }

  async function removeAssignment() {
    if (!editing) return;
    if (!window.confirm(`Remove “${editing.templateName}” from ${editing.date}?`)) return;
    setActionPending(true);
    setActionError(null);
    const res = await fetch(`/api/workouts/assignments/${editing.id}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    setActionPending(false);
    if (!res.ok) {
      setActionError(data.error ?? "Could not remove workout");
      return;
    }
    setAssignments((prev) => prev.filter((a) => a.id !== editing.id));
    setEditing(null);
    startTransition(() => router.refresh());
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-card-border bg-gradient-to-b from-card to-card/40 p-3 sm:p-4",
        pending && "opacity-70"
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Week calendar</h2>
          <p className="text-xs text-muted">
            + adds a workout · tap to edit/remove
            <span className="sm:hidden"> · 3-day view, today centered</span>
            <span className="hidden sm:inline"> · Mon–Fri default · scroll for Sun/Sat</span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            className="rounded-lg border border-card-border p-1.5 text-muted hover:text-foreground"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setParams({ week: weekStartSunday(todayDateString()) })}
            className="rounded-lg border border-card-border px-2.5 py-1 text-xs font-medium"
          >
            This week
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            className="rounded-lg border border-card-border p-1.5 text-muted hover:text-foreground"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]"
      >
        <div
          className="grid gap-1.5 sm:gap-2"
          style={{
            width: `${(days.length / visibleDays) * 100}%`,
            gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
          }}
        >
          {days.map((date, index) => {
            const dayAssignments = byDate.get(date) ?? [];
            const selected = date === selectedDate;
            const isToday = date === todayDateString();
            const dow = format(parseISO(date), "EEE");
            const dayNum = format(parseISO(date), "d");

            return (
              <div
                key={date}
                data-day-index={index}
                className={cn(
                  "flex min-h-[5.5rem] flex-col rounded-xl border px-1.5 py-1.5 sm:min-h-[6.5rem] sm:px-2",
                  selected
                    ? "border-accent/50 bg-accent/10 ring-1 ring-accent/40"
                    : "border-card-border/80 bg-background/30",
                  isToday && !selected && "border-sky-400/40"
                )}
              >
                <div className="mb-1 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => setParams({ date, logView: "day" })}
                    className="flex min-w-0 flex-1 items-baseline justify-between gap-1 text-left"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                      {dow}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-semibold tabular-nums",
                        isToday ? "text-sky-300" : "text-foreground"
                      )}
                    >
                      {dayNum}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openAdd(date)}
                    disabled={!classId || templates.length === 0}
                    className="rounded-md p-0.5 text-muted hover:bg-emerald-500/15 hover:text-emerald-300 disabled:opacity-30"
                    aria-label={`Add workout on ${date}`}
                    title="Add workout"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
                  {dayAssignments.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => openAdd(date)}
                      disabled={!classId || templates.length === 0}
                      className="rounded-md border border-dashed border-card-border/70 px-1 py-2 text-center text-[10px] text-muted/80 hover:border-emerald-400/40 hover:text-emerald-300 disabled:opacity-40"
                    >
                      Add
                    </button>
                  ) : (
                    dayAssignments.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => openEdit(a)}
                        className="rounded-md bg-sky-500/10 px-1 py-0.5 text-left ring-1 ring-sky-400/25 hover:bg-sky-500/20"
                      >
                        <div className="truncate text-[10px] font-medium leading-tight text-sky-100 sm:text-[11px]">
                          {a.templateName}
                        </div>
                        <div className="text-[9px] tabular-nums text-muted sm:text-[10px]">
                          {a.totalCount > 0
                            ? `${a.completedCount}/${a.totalCount} logged`
                            : "No roster"}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setParams({ weeks: String(weeks + 1) })}
          className="rounded-lg border border-card-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground"
        >
          Show next week
        </button>
        {weeks > 1 ? (
          <button
            type="button"
            onClick={() => setParams({ weeks: String(Math.max(1, weeks - 1)) })}
            className="rounded-lg border border-card-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground"
          >
            Fewer weeks
          </button>
        ) : null}
      </div>

      {addDate ? (
        <CoachModal
          eyebrow="Schedule"
          title={`Add workout · ${addDate}`}
          onClose={() => setAddDate(null)}
          maxWidth="max-w-md"
        >
          <div className="space-y-3">
            {actionError && <p className="text-sm text-sport-red">{actionError}</p>}
            {subgroupId && subgroupName ? (
              <p className="text-xs text-muted">
                Assigning to: <span className="font-medium text-foreground">{subgroupName}</span>
              </p>
            ) : null}
            {templates.length === 0 ? (
              <p className="text-sm text-muted">Create a saved workout first, then add it here.</p>
            ) : (
              <label className="block text-sm">
                Saved workout
                <select
                  value={addTemplateId}
                  onChange={(e) => setAddTemplateId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              disabled={actionPending || !addTemplateId || templates.length === 0}
              onClick={() => void addWorkout()}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {actionPending ? "Adding…" : "Add to day"}
            </button>
          </div>
        </CoachModal>
      ) : null}

      {editing ? (
        <CoachModal
          eyebrow="Edit"
          title={editing.templateName}
          onClose={() => setEditing(null)}
          maxWidth="max-w-md"
        >
          <div className="space-y-3">
            {actionError && <p className="text-sm text-sport-red">{actionError}</p>}
            <label className="block text-sm">
              Workout
              <select
                value={editTemplateId}
                onChange={(e) => setEditTemplateId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Date
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={actionPending}
                onClick={() => void saveEdit()}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
              >
                <Pencil className="h-4 w-4" />
                {actionPending ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                disabled={actionPending}
                onClick={() => void removeAssignment()}
                className="inline-flex items-center gap-2 rounded-lg border border-sport-red/40 px-4 py-2 text-sm font-medium text-sport-red hover:bg-sport-red/10 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            </div>
          </div>
        </CoachModal>
      ) : null}
    </section>
  );
}
