"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { WORKOUT_GENERATORS } from "@/lib/services/workout-generator";
import type { SchoolLiftRow } from "@/lib/queries/lifts";
import {
  normalizeSetPrescriptions,
  prescriptionSummary,
  type SetPrescription,
} from "@/lib/workout-prescriptions";

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

type AssignLiftDraft = {
  activitySlug: string;
  name: string;
  sets: SetPrescription[];
};

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

  async function assignProgram(e: React.FormEvent) {
    e.preventDefault();
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
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          Review submissions and export CSV from{" "}
          <Link href="/coach/programs/logs" className="text-accent hover:underline">
            Workout logs
          </Link>
          .
        </p>
      </div>
      {msg && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">{msg}</p>}
      {error && <p className="text-sm text-sport-red">{error}</p>}

      <form onSubmit={generateBlock} className="space-y-3 rounded-2xl border border-card-border bg-card p-4">
        <h2 className="font-semibold">Auto-generate block</h2>
        <p className="text-sm text-muted">{WORKOUT_GENERATORS["linear-5x5-mwf"].description}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm sm:col-span-2">
            Block name
            <input
              required
              value={genBlockName}
              onChange={(e) => setGenBlockName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Class section
            <select
              required
              value={genClassId}
              onChange={(e) => setGenClassId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.period ? `${c.period} — ${c.name}` : c.name}
                </option>
              ))}
            </select>
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
          disabled={pending || classes.length === 0}
          className="rounded-lg bg-accent px-4 py-2 font-medium text-background disabled:opacity-50"
        >
          {pending ? "Generating…" : "Generate Mon / Wed / Fri plan"}
        </button>
      </form>

      <form onSubmit={saveProgram} className="space-y-4 rounded-2xl border border-card-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold">
              {editingTemplateId ? "Edit workout program" : "New workout program"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Define lifts, default sets/reps, then assign to a weight room section by date. Athletes log
              sets with weight and RPE on their Log workout page.
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="pb-2 pr-2">Include</th>
                <th className="pb-2 pr-2">Lift</th>
                <th className="pb-2 pr-2">Sets</th>
                <th className="pb-2">Reps</th>
              </tr>
            </thead>
            <tbody>
              {lifts.map((l, i) => (
                <tr key={l.slug} className="border-t border-card-border/60">
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      checked={l.enabled}
                      onChange={(e) => {
                        const next = [...lifts];
                        next[i] = { ...l, enabled: e.target.checked };
                        setLifts(next);
                      }}
                    />
                  </td>
                  <td className="py-2 pr-2 font-medium">{l.name}</td>
                  <td className="py-2 pr-2">
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
                      className="w-16 rounded border border-card-border bg-background px-2 py-1"
                    />
                  </td>
                  <td className="py-2">
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
                      className="w-16 rounded border border-card-border bg-background px-2 py-1"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="submit"
          disabled={pending || !programName.trim()}
          className="rounded-lg bg-accent px-4 py-2 font-medium text-background disabled:opacity-50"
        >
          {pending ? "Saving…" : editingTemplateId ? "Save changes" : "Save program"}
        </button>
      </form>

      <form onSubmit={assignProgram} className="space-y-3 rounded-2xl border border-card-border bg-card p-4">
        <h2 className="font-semibold">Assign to class</h2>
        <p className="text-sm text-muted">
          Pick a program to load each lift and set. Set % of 1RM for an intensity day (e.g. 85%), then
          assign — the program template is updated and athletes see recommended weights from their
          logged 1RM.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            Program
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
            Class section
            <select
              required
              value={assignClassId}
              onChange={(e) => setAssignClassId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.period ? `${c.period} — ${c.name}` : c.name}
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

        {assignPreviewReady ? (
          <div className="space-y-4 rounded-xl border border-card-border/80 bg-background/50 p-3">
            <div className="flex flex-wrap items-end gap-2">
              <label className="block text-sm">
                Apply % 1RM to all sets
                <input
                  type="number"
                  min={1}
                  max={120}
                  placeholder="e.g. 85"
                  value={bulkPercent}
                  onChange={(e) => setBulkPercent(e.target.value)}
                  className="mt-1 w-28 rounded-lg border border-card-border bg-background px-3 py-2"
                />
              </label>
              <button
                type="button"
                onClick={applyBulkPercent}
                className="rounded-lg border border-card-border px-3 py-2 text-sm hover:border-sky-400/40"
              >
                Apply to all
              </button>
            </div>

            {assignLifts.map((lift, liftIdx) => (
              <div key={lift.activitySlug} className="space-y-2 border-t border-card-border/60 pt-3 first:border-0 first:pt-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{lift.name}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const last = lift.sets[lift.sets.length - 1];
                        updateAssignLift(liftIdx, [
                          ...lift.sets,
                          {
                            reps: last?.reps ?? 5,
                            percentOf1Rm: last?.percentOf1Rm ?? null,
                          },
                        ]);
                      }}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:text-foreground"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add set
                    </button>
                    {lift.sets.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => updateAssignLift(liftIdx, lift.sets.slice(0, -1))}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:text-sport-red"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove set
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-2">
                  {lift.sets.map((set, setIdx) => (
                    <div
                      key={setIdx}
                      className="flex flex-wrap items-end gap-2 rounded-lg border border-card-border/50 px-2 py-2"
                    >
                      <span className="w-12 pb-2 text-xs font-medium text-muted">Set {setIdx + 1}</span>
                      <label className="text-xs">
                        Reps
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={set.reps}
                          onChange={(e) => {
                            const next = [...lift.sets];
                            next[setIdx] = { ...set, reps: Number(e.target.value) || 1 };
                            updateAssignLift(liftIdx, next);
                          }}
                          className="mt-0.5 block w-16 rounded border border-card-border bg-background px-2 py-1.5 text-sm"
                        />
                      </label>
                      <label className="text-xs">
                        % of 1RM
                        <input
                          type="number"
                          min={1}
                          max={120}
                          placeholder="—"
                          value={set.percentOf1Rm ?? ""}
                          onChange={(e) => {
                            const next = [...lift.sets];
                            const raw = e.target.value.trim();
                            next[setIdx] = {
                              ...set,
                              percentOf1Rm: raw === "" ? null : Number(raw),
                            };
                            updateAssignLift(liftIdx, next);
                          }}
                          className="mt-0.5 block w-20 rounded border border-card-border bg-background px-2 py-1.5 text-sm"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Select a program to preview lifts and set intensities.</p>
        )}

        <button
          type="submit"
          disabled={pending || !assignPreviewReady || classes.length === 0}
          className="rounded-lg bg-accent px-4 py-2 font-medium text-background disabled:opacity-50"
        >
          {pending ? "Assigning…" : "Assign for this date"}
        </button>
      </form>

      <section>
        <h2 className="mb-3 font-semibold">Saved programs</h2>
        {templates.length === 0 ? (
          <p className="text-sm text-muted">No programs yet.</p>
        ) : (
          <ul className="space-y-3">
            {templates.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-card-border bg-card/50 px-4 py-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{t.name}</div>
                  <div className="mt-1 text-muted">
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
                  <div className="mt-1 text-xs text-muted">
                    {t._count.assignments} assignment{t._count.assignments === 1 ? "" : "s"}
                  </div>
                </div>
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
  );
}
