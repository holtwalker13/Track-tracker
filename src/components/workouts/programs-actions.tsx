"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Layers, Plus } from "lucide-react";
import { WORKOUT_GENERATORS } from "@/lib/services/workout-generator";
import type { SchoolLiftRow } from "@/lib/queries/lifts";
import {
  normalizeSetPrescriptions,
  type SetPrescription,
} from "@/lib/workout-prescriptions";
import {
  ProgramsSetBuilderGrid,
  type AssignLiftDraft,
} from "@/components/workouts/programs-set-builder-grid";
import { CoachModal } from "@/components/ui/coach-modal";
import { classSectionLabel } from "@/lib/periods";
import { cn } from "@/lib/utils";

type TemplateRow = {
  id: string;
  name: string;
  updatedAt: string;
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

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const [assignTemplateId, setAssignTemplateId] = useState(initialTemplates[0]?.id ?? "");
  const [assignDate, setAssignDate] = useState(selectedDate);
  const [assignLifts, setAssignLifts] = useState<AssignLiftDraft[]>([]);
  const [bulkPercent, setBulkPercent] = useState("");

  const [programName, setProgramName] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  const defaultLiftState = () =>
    workoutLifts.map((l) => ({
      slug: l.slug,
      name: l.name,
      enabled: true,
      sets: 3,
      reps: 5,
    }));
  const [lifts, setLifts] = useState(defaultLiftState);

  const [genStartDate, setGenStartDate] = useState(selectedDate);
  const [genBlockName, setGenBlockName] = useState("Fall linear block");
  const [genWeeks, setGenWeeks] = useState(4);

  useEffect(() => {
    setTemplates(initialTemplates);
  }, [initialTemplates]);

  useEffect(() => {
    setAssignDate(selectedDate);
    setGenStartDate(selectedDate);
  }, [selectedDate]);

  function draftFromTemplate(template: TemplateRow | undefined): AssignLiftDraft[] {
    if (!template) return [];
    return template.exercises.map((ex) => ({
      activitySlug: ex.activity.slug,
      name: ex.activity.name,
      sets: normalizeSetPrescriptions(ex.setPrescriptions, ex.defaultSets, ex.defaultReps),
    }));
  }

  useEffect(() => {
    const selected = templates.find((t) => t.id === assignTemplateId);
    setAssignLifts(draftFromTemplate(selected));
  }, [assignTemplateId, templates]);

  function openSchedule() {
    setError(null);
    setMsg(null);
    setAssignDate(selectedDate);
    if (!assignTemplateId && templates[0]) setAssignTemplateId(templates[0].id);
    setScheduleOpen(true);
  }

  function openCreate() {
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
    setLifts(
      workoutLifts.map((l) => {
        const ex = bySlug.get(l.slug);
        const sets = ex
          ? normalizeSetPrescriptions(ex.setPrescriptions, ex.defaultSets, ex.defaultReps)
          : null;
        return {
          slug: l.slug,
          name: l.name,
          enabled: Boolean(ex),
          sets: sets?.length ?? 3,
          reps: sets?.[0]?.reps ?? ex?.defaultReps ?? 5,
        };
      })
    );
    setError(null);
    setCreateOpen(true);
  }

  function updateAssignLift(index: number, sets: SetPrescription[]) {
    setAssignLifts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, sets };
      return next;
    });
  }

  function applyBulkPercent() {
    const pct =
      bulkPercent.trim() === ""
        ? null
        : Math.min(120, Math.max(1, Number(bulkPercent)));
    if (bulkPercent.trim() !== "" && (pct == null || !Number.isFinite(pct))) return;
    setAssignLifts((prev) =>
      prev.map((lift) => ({
        ...lift,
        sets: lift.sets.map((s) => ({ ...s, percentOf1Rm: pct })),
      }))
    );
  }

  async function doAssign() {
    if (!selectedClass) {
      setError("Select a class first.");
      return;
    }
    if (!assignTemplateId || assignLifts.length === 0) {
      setError("Select a workout with at least one lift.");
      return;
    }
    setPending(true);
    setError(null);
    setMsg(null);

    const patchRes = await fetch(`/api/workouts/templates/${assignTemplateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exercises: assignLifts.map((l) => ({
          activitySlug: l.activitySlug,
          defaultSets: l.sets.length,
          defaultReps: l.sets[0]?.reps ?? 5,
          setPrescriptions: l.sets,
        })),
      }),
    });
    const patchData = await patchRes.json();
    if (!patchRes.ok) {
      setPending(false);
      setError(patchData.error ?? "Could not update workout intensities");
      return;
    }
    const saved = patchData.template as TemplateRow;
    setTemplates((t) => t.map((row) => (row.id === saved.id ? saved : row)));

    const res = await fetch("/api/workouts/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: assignTemplateId,
        classId: selectedClass.id,
        subgroupId: selectedSubgroupId || undefined,
        scheduledDate: assignDate,
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not add workout to schedule");
      return;
    }
    setMsg(
      `Scheduled “${data.assignment.template.name}” for ${classSectionLabel(selectedClass)} on ${assignDate}.`
    );
    setScheduleOpen(false);
    router.refresh();
  }

  async function saveProgram(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMsg(null);
    const exercises = lifts
      .filter((l) => l.enabled)
      .map((l) => {
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
    const res = await fetch(
      isEdit ? `/api/workouts/templates/${editingTemplateId}` : "/api/workouts/templates",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: programName, exercises }),
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
      setAssignTemplateId(saved.id);
      setMsg(`Created “${saved.name}”. You can add it to the schedule.`);
    }
    setCreateOpen(false);
    router.refresh();
  }

  async function generateBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClass) {
      setError("Select a class first.");
      return;
    }
    setPending(true);
    setError(null);
    setMsg(null);
    const res = await fetch("/api/workouts/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generatorKey: "linear-5x5-mwf",
        classId: selectedClass.id,
        subgroupId: selectedSubgroupId || undefined,
        startDate: genStartDate,
        blockName: genBlockName,
        weeks: genWeeks,
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not generate block");
      return;
    }
    setMsg(
      `Generated ${data.assignmentsCreated} workouts (${data.generatorLabel}). Athletes see them on matching dates.`
    );
    setBulkOpen(false);
    router.refresh();
  }

  const canSchedule = Boolean(selectedClass && assignTemplateId && assignLifts.length > 0);
  const classLabel = selectedClass ? classSectionLabel(selectedClass) : "Select a class";
  const scopeLabel =
    selectedSubgroupId && selectedSubgroupName
      ? `${classLabel} · ${selectedSubgroupName}`
      : classLabel;

  const previewReady = useMemo(
    () => Boolean(assignTemplateId && assignLifts.length > 0 && selectedClass),
    [assignTemplateId, assignLifts.length, selectedClass]
  );

  return (
    <div className="space-y-4">
      {msg && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
          {msg}
        </p>
      )}
      {error && !scheduleOpen && !createOpen && !bulkOpen && (
        <p className="text-sm text-sport-red">{error}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={openSchedule}
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
          className="flex items-center gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/5 px-4 py-3 text-left transition hover:border-sky-400/50"
        >
          <Plus className="h-5 w-5 shrink-0 text-sky-300" />
          <span>
            <span className="block text-sm font-semibold">Create new workout</span>
            <span className="block text-xs text-muted">Build a day program from lifts</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setBulkOpen(true);
          }}
          disabled={!selectedClass}
          className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-left transition hover:border-amber-400/50 disabled:opacity-50"
        >
          <Layers className="h-5 w-5 shrink-0 text-amber-200" />
          <span>
            <span className="block text-sm font-semibold">Bulk build block</span>
            <span className="block text-xs text-muted">Sister action · multi-week assign</span>
          </span>
        </button>
      </div>

      <section className="rounded-2xl border border-card-border bg-card/40 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">Saved workouts</h2>
            <p className="text-xs text-muted">Day programs you can schedule or edit</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-400/15 px-3 py-1.5 text-xs font-semibold text-sky-300 ring-1 ring-sky-400/35"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
        </div>
        {templates.length === 0 ? (
          <p className="text-sm text-muted">No workouts yet — create one to schedule on the calendar.</p>
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
                    {t.exercises.map((ex) => ex.activity.name).join(" · ") || "No lifts"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAssignTemplateId(t.id);
                      openSchedule();
                    }}
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {scheduleOpen ? (
        <CoachModal
          eyebrow="Schedule"
          title="Add workout to schedule"
          onClose={() => setScheduleOpen(false)}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4">
            {error && <p className="text-sm text-sport-red">{error}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                Saved workout
                <select
                  required
                  value={assignTemplateId}
                  onChange={(e) => setAssignTemplateId(e.target.value)}
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
                  required
                  type="date"
                  value={assignDate}
                  onChange={(e) => setAssignDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
                />
              </label>
            </div>
            <p className="text-xs text-muted">
              Assigning to: <span className="font-medium text-foreground">{scopeLabel}</span>
            </p>
            <ProgramsSetBuilderGrid
              lifts={assignLifts}
              bulkPercent={bulkPercent}
              onBulkPercentChange={setBulkPercent}
              onApplyBulkPercent={applyBulkPercent}
              onUpdateLift={updateAssignLift}
            />
            <button
              type="button"
              disabled={pending || !previewReady || !canSchedule}
              onClick={() => void doAssign()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
            >
              {pending ? "Scheduling…" : "Add to calendar"}
            </button>
          </div>
        </CoachModal>
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
            <div className="grid gap-2 sm:grid-cols-2">
              {lifts.map((l, i) => (
                <label
                  key={l.slug}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm",
                    l.enabled
                      ? "border-sky-400/40 bg-sky-500/10"
                      : "border-card-border bg-background/30 opacity-80"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={l.enabled}
                    onChange={(e) => {
                      const next = [...lifts];
                      next[i] = { ...l, enabled: e.target.checked };
                      setLifts(next);
                    }}
                    className="shrink-0"
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">{l.name}</span>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
                    <input
                      type="number"
                      min={1}
                      max={20}
                      disabled={!l.enabled}
                      value={l.sets}
                      onChange={(e) => {
                        const next = [...lifts];
                        next[i] = { ...l, sets: Number(e.target.value) };
                        setLifts(next);
                      }}
                      className="w-12 rounded border border-card-border bg-background px-1 py-0.5 text-center"
                      aria-label={`Sets for ${l.name}`}
                    />
                    ×
                    <input
                      type="number"
                      min={1}
                      max={50}
                      disabled={!l.enabled}
                      value={l.reps}
                      onChange={(e) => {
                        const next = [...lifts];
                        next[i] = { ...l, reps: Number(e.target.value) };
                        setLifts(next);
                      }}
                      className="w-12 rounded border border-card-border bg-background px-1 py-0.5 text-center"
                      aria-label={`Reps for ${l.name}`}
                    />
                  </span>
                </label>
              ))}
            </div>
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

      {bulkOpen ? (
        <CoachModal
          eyebrow="Bulk"
          title="Build training block"
          onClose={() => setBulkOpen(false)}
          maxWidth="max-w-lg"
        >
          <form onSubmit={generateBlock} className="space-y-3">
            {error && <p className="text-sm text-sport-red">{error}</p>}
            <p className="text-xs text-muted">{WORKOUT_GENERATORS["linear-5x5-mwf"].description}</p>
            <p className="text-sm">
              Assigning to: <span className="font-medium">{scopeLabel}</span>
            </p>
            <label className="block text-sm">
              Block name
              <input
                required
                value={genBlockName}
                onChange={(e) => setGenBlockName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              Start date
              <input
                required
                type="date"
                value={genStartDate}
                onChange={(e) => setGenStartDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              Weeks
              <input
                required
                type="number"
                min={1}
                max={12}
                value={genWeeks}
                onChange={(e) => setGenWeeks(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={pending || !selectedClass}
              className="rounded-lg bg-amber-400/20 px-4 py-2 text-sm font-semibold text-amber-100 ring-1 ring-amber-400/40 disabled:opacity-50"
            >
              {pending ? "Generating…" : "Generate block"}
            </button>
          </form>
        </CoachModal>
      ) : null}
    </div>
  );
}
