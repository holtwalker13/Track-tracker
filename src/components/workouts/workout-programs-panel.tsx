"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { WORKOUT_GENERATORS } from "@/lib/services/workout-generator";
import type { SchoolLiftRow } from "@/lib/queries/lifts";
import {
  normalizeSetPrescriptions,
  prescriptionSummary,
  type SetPrescription,
} from "@/lib/workout-prescriptions";
import { ProgramsClassTabs } from "@/components/workouts/programs-class-tabs";
import {
  ProgramsSetBuilderGrid,
  type AssignLiftDraft,
} from "@/components/workouts/programs-set-builder-grid";
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

function StepBadge({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-300 ring-1 ring-sky-400/40">
        {n}
      </span>
      <span className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
    </div>
  );
}

export function WorkoutProgramsPanel({
  templates: initialTemplates,
  classes,
  workoutLifts,
}: {
  templates: TemplateRow[];
  classes: ClassOption[];
  workoutLifts: SchoolLiftRow[];
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [programName, setProgramName] = useState("");
  const [assignTemplateId, setAssignTemplateId] = useState(initialTemplates[0]?.id ?? "");
  const [assignClassId, setAssignClassId] = useState(classes[0]?.id ?? "");
  const [assignDate, setAssignDate] = useState(new Date().toISOString().slice(0, 10));
  const [assignLifts, setAssignLifts] = useState<AssignLiftDraft[]>([]);
  const [bulkPercent, setBulkPercent] = useState("");

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

  const [genClassId, setGenClassId] = useState(classes[0]?.id ?? "");
  const [genStartDate, setGenStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [genBlockName, setGenBlockName] = useState("Fall linear block");
  const [genWeeks, setGenWeeks] = useState(4);

  function selectClass(id: string) {
    setAssignClassId(id);
    setGenClassId(id);
  }

  const defaultLiftState = () =>
    workoutLifts.map((l) => ({
      slug: l.slug,
      name: l.name,
      enabled: true,
      sets: 3,
      reps: 5,
    }));

  const [lifts, setLifts] = useState(defaultLiftState);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (editingTemplateId) return;
    setLifts(defaultLiftState());
  }, [workoutLifts, editingTemplateId]);

  function liftsFromTemplate(template: TemplateRow) {
    const bySlug = new Map(template.exercises.map((ex) => [ex.activity.slug, ex]));
    return workoutLifts.map((l) => {
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
        percentOf1Rm: sets?.[0]?.percentOf1Rm ?? null,
      };
    });
  }

  function startEditProgram(template: TemplateRow) {
    setEditingTemplateId(template.id);
    setProgramName(template.name);
    setLifts(liftsFromTemplate(template));
    setMsg(null);
    setError(null);
  }

  function cancelEditProgram() {
    setEditingTemplateId(null);
    setProgramName("");
    setLifts(defaultLiftState());
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
      setError(data.error ?? (isEdit ? "Could not update program" : "Could not create program"));
      return;
    }

    const saved = data.template as TemplateRow;
    if (isEdit) {
      setTemplates((t) => t.map((row) => (row.id === saved.id ? { ...saved, updatedAt: saved.updatedAt } : row)));
      setAssignTemplateId(saved.id);
      setEditingTemplateId(null);
      setProgramName("");
      setLifts(defaultLiftState());
      setMsg(
        data.hadAssignments
          ? `Updated “${saved.name}”. Past assignments keep their logged sets; new assignments use this version.`
          : `Updated “${saved.name}”.`
      );
    } else {
      setTemplates((t) => [saved, ...t]);
      setAssignTemplateId(saved.id);
      setProgramName("");
      setLifts(defaultLiftState());
      setMsg(`Created “${saved.name}”. Assign it to a class below.`);
    }
    router.refresh();
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
    if (!assignTemplateId || assignLifts.length === 0) {
      setError("Select a program with at least one lift.");
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
      setError(patchData.error ?? "Could not update program intensities");
      return;
    }
    const saved = patchData.template as TemplateRow;
    setTemplates((t) => t.map((row) => (row.id === saved.id ? saved : row)));

    const res = await fetch("/api/workouts/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: assignTemplateId,
        classId: assignClassId,
        scheduledDate: assignDate,
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not assign");
      return;
    }
    setMsg(
      `Updated program intensities and assigned “${data.assignment.template.name}” to ${data.assignment.class.name} on ${assignDate}.`
    );
    router.refresh();
  }

  async function assignProgram(e: React.FormEvent) {
    e.preventDefault();
    await doAssign();
  }

  async function quickAssignToClass() {
    if (!assignPreviewReady) {
      setError("Choose a day program below, then tap + on the active class tab.");
      return;
    }
    await doAssign();
  }

  const assignPreviewReady = useMemo(
    () => Boolean(assignTemplateId && assignLifts.length > 0),
    [assignTemplateId, assignLifts.length]
  );

  async function generateBlock(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMsg(null);
    const res = await fetch("/api/workouts/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generatorKey: "linear-5x5-mwf",
        classId: genClassId,
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
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Review submissions and export CSV from{" "}
        <Link href="/coach/programs/logs" className="text-accent hover:underline">
          Workout logs
        </Link>
        .
      </p>
      {msg && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
          {msg}
        </p>
      )}
      {error && <p className="text-sm text-sport-red">{error}</p>}

      <div className="rounded-2xl border border-card-border bg-card/30 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          Your classes
        </p>
        <ProgramsClassTabs
          classes={classes}
          activeClassId={assignClassId}
          onSelectClass={selectClass}
          onQuickAssign={() => void quickAssignToClass()}
          quickAssignDisabled={pending || !assignPreviewReady}
        />
        <p className="mt-2 text-xs text-muted">
          Tabs set the class for blocks and assignments. Tap{" "}
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent align-middle text-[10px] font-bold text-background">
            +
          </span>{" "}
          on the active tab to push the selected day program to that class for the date below.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-3">
          <form
            onSubmit={saveProgram}
            className="space-y-4 rounded-2xl border border-sky-500/20 bg-gradient-to-b from-card to-card/50 p-4 sm:p-5"
          >
            <StepBadge n={2} label="Day programs" />
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingTemplateId ? "Edit day program" : "New day program"}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  One workout day built from your library — default sets and reps only. Intensity (%
                  1RM) is set when you assign.
                </p>
              </div>
              {editingTemplateId ? (
                <button
                  type="button"
                  onClick={cancelEditProgram}
                  className="rounded-lg border border-card-border px-3 py-1.5 text-sm text-muted hover:text-foreground"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
            <label className="block text-sm">
              Program name
              <input
                required
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="Week 3 — Lower body"
                className="mt-1 w-full max-w-md rounded-lg border border-card-border bg-background px-3 py-2"
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
            <button
              type="submit"
              disabled={pending || !programName.trim()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
            >
              {pending ? "Saving…" : editingTemplateId ? "Save changes" : "Save day program"}
            </button>
          </form>

          <section className="rounded-2xl border border-card-border/80 bg-card/40 p-4">
            <h3 className="text-sm font-semibold">Saved day programs</h3>
            {templates.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No programs yet — save one above.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {templates.map((t) => (
                  <li
                    key={t.id}
                    className={cn(
                      "flex flex-wrap items-start justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm",
                      assignTemplateId === t.id
                        ? "border-sky-400/50 bg-sky-500/10"
                        : "border-card-border bg-background/30"
                    )}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setAssignTemplateId(t.id)}
                    >
                      <div className="font-medium">{t.name}</div>
                      <div className="mt-0.5 text-xs text-muted">
                        {t.exercises
                          .map((ex) => {
                            const sets = normalizeSetPrescriptions(
                              ex.setPrescriptions,
                              ex.defaultSets,
                              ex.defaultReps
                            );
                            return `${ex.activity.name} ${prescriptionSummary(sets)}`;
                          })
                          .join(" · ")}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditProgram(t)}
                      className="rounded-md p-1.5 text-muted hover:bg-sky-400/10 hover:text-sky-300"
                      aria-label={`Edit ${t.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <form
          onSubmit={generateBlock}
          className="space-y-3 rounded-2xl border border-amber-500/25 bg-gradient-to-b from-amber-500/5 to-card/40 p-4 xl:col-span-2 xl:self-start"
        >
          <StepBadge n={3} label="Training block" />
          <h2 className="text-lg font-semibold">Auto-generate block</h2>
          <p className="text-sm text-muted">
            Multi-week schedule (not a single day). Uses the{" "}
            <strong className="font-medium text-foreground">class tab</strong> selected above.
          </p>
          <p className="text-xs text-muted">{WORKOUT_GENERATORS["linear-5x5-mwf"].description}</p>
          <label className="block text-sm">
            Block name
            <input
              required
              value={genBlockName}
              onChange={(e) => setGenBlockName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
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
                type="number"
                min={1}
                max={12}
                value={genWeeks}
                onChange={(e) => setGenWeeks(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={pending || classes.length === 0 || !genClassId}
            className="w-full rounded-lg border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-100 disabled:opacity-50"
          >
            {pending ? "Generating…" : "Generate Mon / Wed / Fri block"}
          </button>
        </form>
      </div>

      <form
        onSubmit={assignProgram}
        className="space-y-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/5 to-card/50 p-4 sm:p-5"
      >
        <StepBadge n={4} label="Assign & set builder" />
        <h2 className="text-lg font-semibold">Load program into class</h2>
        <p className="text-sm text-muted">
          Choose a saved day program, edit sets and % 1RM in the grid, then assign for one date.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
          <label className="block text-sm">
            Day program
            <select
              required
              value={assignTemplateId}
              onChange={(e) => setAssignTemplateId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
            >
              <option value="" disabled>
                Select…
              </option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Workout date
            <input
              required
              type="date"
              value={assignDate}
              onChange={(e) => setAssignDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
            />
          </label>
        </div>

        <ProgramsSetBuilderGrid
          lifts={assignLifts}
          bulkPercent={bulkPercent}
          onBulkPercentChange={setBulkPercent}
          onApplyBulkPercent={applyBulkPercent}
          onUpdateLift={updateAssignLift}
        />

        <button
          type="submit"
          disabled={pending || !assignPreviewReady || classes.length === 0}
          className="rounded-lg bg-accent px-4 py-2 font-medium text-background disabled:opacity-50"
        >
          {pending ? "Assigning…" : "Assign for this date"}
        </button>
      </form>
    </div>
  );
}
