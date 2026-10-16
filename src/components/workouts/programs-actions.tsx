"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarPlus, Plus } from "lucide-react";
import type { SchoolLiftRow } from "@/lib/queries/lifts";
import { normalizeSetPrescriptions } from "@/lib/workout-prescriptions";
import { CoachModal } from "@/components/ui/coach-modal";
import { ScheduleWorkoutDialog } from "@/components/workouts/schedule-workout-dialog";
import { classSectionLabel } from "@/lib/periods";
import {
  WorkoutLiftPicker,
  orderedEnabledLifts,
  type WorkoutLiftDraft,
} from "@/components/workouts/workout-lift-picker";

type TemplateRow = {
  id: string;
  name: string;
  updatedAt: string;
  createdByName?: string | null;
  canDelete?: boolean;
  exercises: {
    id: string;
    defaultSets: number;
    defaultReps: number;
    setPrescriptions?: unknown;
    activity: { slug: string; name: string };
  }[];
  _count: { assignments: number };
};

type ClassOption = { id: string; name: string; period: string | null };

export function ProgramsActions({
  templates: initialTemplates,
  selectedClass,
  selectedSubgroupId,
  selectedSubgroupName,
  selectedDate,
  workoutLifts,
}: {
  templates: TemplateRow[];
  selectedClass: ClassOption | null;
  selectedSubgroupId?: string | null;
  selectedSubgroupName?: string | null;
  selectedDate: string;
  workoutLifts: SchoolLiftRow[];
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [scheduleTemplateId, setScheduleTemplateId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [programName, setProgramName] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  const defaultLiftState = (): WorkoutLiftDraft[] =>
    workoutLifts.map((l) => ({
      slug: l.slug,
      name: l.name,
      bodyGroup: l.bodyGroup,
      enabled: false,
      order: null,
      sets: 3,
      reps: 5,
    }));
  const [lifts, setLifts] = useState(defaultLiftState);

  useEffect(() => {
    setTemplates(initialTemplates);
  }, [initialTemplates]);

  function openSchedule(templateId?: string) {
    setError(null);
    setMsg(null);
    const id = templateId || templates[0]?.id;
    if (!id) return;
    setScheduleTemplateId(id);
  }

  function openCreate() {
    if (!selectedClass) {
      setError("Select a class first.");
      return;
    }
    setEditingTemplateId(null);
    setProgramName("");
    setLifts(defaultLiftState());
    setError(null);
    setCreateOpen(true);
  }

  function startEdit(template: TemplateRow) {
    setEditingTemplateId(template.id);
    setProgramName(template.name);
    const bySlug = new Map(template.exercises.map((ex) => [ex.activity.slug, ex]));
    const orderBySlug = new Map(template.exercises.map((ex, index) => [ex.activity.slug, index + 1]));
    setLifts(
      workoutLifts.map((l) => {
        const ex = bySlug.get(l.slug);
        const sets = ex
          ? normalizeSetPrescriptions(ex.setPrescriptions, ex.defaultSets, ex.defaultReps)
          : null;
        const enabled = Boolean(ex);
        return {
          slug: l.slug,
          name: l.name,
          bodyGroup: l.bodyGroup,
          enabled,
          order: enabled ? (orderBySlug.get(l.slug) ?? null) : null,
          sets: sets?.length ?? 3,
          reps: sets?.[0]?.reps ?? ex?.defaultReps ?? 5,
        };
      })
    );
    setError(null);
    setCreateOpen(true);
  }

  async function archiveWorkout(template: TemplateRow) {
    if (!window.confirm(`Remove “${template.name}” from this class’s saved workouts? Days already on the calendar stay.`)) {
      return;
    }
    setPending(true);
    setError(null);
    const res = await fetch(`/api/workouts/templates/${template.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not remove workout");
      return;
    }
    setTemplates((rows) => rows.filter((row) => row.id !== template.id));
    setMsg(`Removed “${template.name}” from saved workouts.`);
  }

  async function saveProgram(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMsg(null);
    const exercises = orderedEnabledLifts(lifts).map((l) => {
        const existing = templates
          .find((t) => t.id === editingTemplateId)
          ?.exercises.find((ex) => ex.activity.slug === l.slug);
        const prior = existing
          ? normalizeSetPrescriptions(
              existing.setPrescriptions,
              existing.defaultSets,
              existing.defaultReps
            )
          : null;
        const setPrescriptions = Array.from({ length: l.sets }, (_, i) => ({
          reps: l.reps,
          percentOf1Rm: prior?.[i]?.percentOf1Rm ?? prior?.[0]?.percentOf1Rm ?? null,
        }));
        return {
          activitySlug: l.slug,
          defaultSets: l.sets,
          defaultReps: l.reps,
          setPrescriptions,
        };
      });
    if (exercises.length === 0) {
      setPending(false);
      setError("Include at least one lift.");
      return;
    }

    const isEdit = Boolean(editingTemplateId);
    const classIdForCreate = selectedClass?.id;
    if (!isEdit && !classIdForCreate) {
      setPending(false);
      setError("Select a class first.");
      return;
    }
    const res = await fetch(
      isEdit ? `/api/workouts/templates/${editingTemplateId}` : "/api/workouts/templates",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: programName,
          exercises,
          ...(isEdit || !classIdForCreate ? {} : { classId: classIdForCreate }),
        }),
      }
    );
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? (isEdit ? "Could not update workout" : "Could not create workout"));
      return;
    }

    const saved = data.template as TemplateRow;
    if (isEdit) {
      setTemplates((t) => t.map((row) => (row.id === saved.id ? saved : row)));
      setMsg(`Updated “${saved.name}”.`);
    } else {
      setTemplates((t) => [saved, ...t]);
      setMsg(`Created “${saved.name}”. You can add it to the schedule.`);
    }
    setCreateOpen(false);
    router.refresh();
  }

  const classLabel = selectedClass ? classSectionLabel(selectedClass) : "Select a class";
  const scopeLabel =
    selectedSubgroupId && selectedSubgroupName
      ? `${classLabel} · ${selectedSubgroupName}`
      : classLabel;

  return (
    <div className="space-y-4">
      {msg && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
          {msg}
        </p>
      )}
      {error && !scheduleTemplateId && !createOpen && (
        <p className="text-sm text-sport-red">{error}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => openSchedule()}
          disabled={!selectedClass || templates.length === 0}
          className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-left transition hover:border-emerald-400/50 disabled:opacity-50"
        >
          <CalendarPlus className="h-5 w-5 shrink-0 text-emerald-300" />
          <span>
            <span className="block text-sm font-semibold">Add workout to schedule</span>
            <span className="block text-xs text-muted">Pick a saved workout for {scopeLabel}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={openCreate}
          disabled={!selectedClass}
          className="flex items-center gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/5 px-4 py-3 text-left transition hover:border-sky-400/50 disabled:opacity-50"
        >
          <Plus className="h-5 w-5 shrink-0 text-sky-300" />
          <span>
            <span className="block text-sm font-semibold">Create new workout</span>
            <span className="block text-xs text-muted">Build a day program from lifts</span>
          </span>
        </button>
      </div>

      <section className="rounded-2xl border border-card-border bg-card/40 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">Saved workouts</h2>
            <p className="text-xs text-muted">Shared with the coaches on this class</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            disabled={!selectedClass}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-400/15 px-3 py-1.5 text-xs font-semibold text-sky-300 ring-1 ring-sky-400/35 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Create
          </button>
        </div>
        {templates.length === 0 ? (
          <p className="text-sm text-muted">
            {selectedClass
              ? "No workouts for this class yet."
              : "Select a class to see its saved workouts."}
          </p>
        ) : (
          <ul className="space-y-2">
            {templates.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-card-border bg-background/30 px-3 py-2.5 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{t.name}</div>
                  <div className="mt-0.5 text-xs text-muted">
                    {t.createdByName ? `Coach ${t.createdByName}` : "Coach unknown"}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {t.exercises.map((ex) => ex.activity.name).join(" · ") || "No lifts"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openSchedule(t.id)}
                    disabled={!selectedClass}
                    className="rounded-md px-2 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-40"
                  >
                    Schedule
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(t)}
                    className="rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-sky-400/10 hover:text-sky-300"
                  >
                    Edit
                  </button>
                  {t.canDelete !== false ? (
                    <button
                      type="button"
                      onClick={() => void archiveWorkout(t)}
                      disabled={pending}
                      className="rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-sport-red/10 hover:text-sport-red disabled:opacity-40"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {scheduleTemplateId && selectedClass ? (
        <ScheduleWorkoutDialog
          templates={templates}
          classId={selectedClass.id}
          scopeLabel={scopeLabel}
          subgroupId={selectedSubgroupId}
          initialDate={selectedDate}
          initialTemplateId={scheduleTemplateId}
          onClose={() => setScheduleTemplateId(null)}
        />
      ) : null}

      {createOpen ? (
        <CoachModal
          eyebrow="Workouts"
          title={editingTemplateId ? "Edit workout" : "Create new workout"}
          onClose={() => setCreateOpen(false)}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={saveProgram} className="space-y-4">
            {error && <p className="text-sm text-sport-red">{error}</p>}
            <label className="block text-sm">
              Workout name
              <input
                required
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="Week 3 — Lower body"
                className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
              />
            </label>
            <WorkoutLiftPicker lifts={lifts} onChange={setLifts} />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={pending || !programName.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
              >
                {pending ? "Saving…" : editingTemplateId ? "Save changes" : "Save workout"}
              </button>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg border border-card-border px-4 py-2 text-sm text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </form>
        </CoachModal>
      ) : null}

    </div>
  );
}
