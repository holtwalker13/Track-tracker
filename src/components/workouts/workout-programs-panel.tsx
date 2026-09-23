"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LIFTING_WORKOUT_SLUGS } from "@/lib/lifting";

type TemplateRow = {
  id: string;
  name: string;
  updatedAt: string;
  exercises: {
    id: string;
    defaultSets: number;
    defaultReps: number;
    activity: { slug: string; name: string };
  }[];
  _count: { assignments: number };
};

type ClassOption = { id: string; name: string; period: string | null };

export function WorkoutProgramsPanel({
  templates: initialTemplates,
  classes,
  liftOptions,
}: {
  templates: TemplateRow[];
  classes: ClassOption[];
  liftOptions: { slug: string; name: string }[];
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

  const defaultLiftState = () =>
    LIFTING_WORKOUT_SLUGS.map((slug) => {
      const meta = liftOptions.find((l) => l.slug === slug);
      return {
        slug,
        name: meta?.name ?? slug,
        enabled: true,
        sets: 3,
        reps: 5,
      };
    });

  const [lifts, setLifts] = useState(defaultLiftState);

  async function createProgram(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMsg(null);
    const exercises = lifts
      .filter((l) => l.enabled)
      .map((l) => ({
        activitySlug: l.slug,
        defaultSets: l.sets,
        defaultReps: l.reps,
      }));
    const res = await fetch("/api/workouts/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: programName, exercises }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create program");
      return;
    }
    setTemplates((t) => [data.template, ...t]);
    setAssignTemplateId(data.template.id);
    setProgramName("");
    setLifts(defaultLiftState());
    setMsg(`Created “${data.template.name}”. Assign it to a class below.`);
    router.refresh();
  }

  async function assignProgram(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMsg(null);
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
      `Assigned “${data.assignment.template.name}” to ${data.assignment.class.name} on ${assignDate}.`
    );
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {msg && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">{msg}</p>}
      {error && <p className="text-sm text-sport-red">{error}</p>}

      <form onSubmit={createProgram} className="space-y-4 rounded-2xl border border-card-border bg-card p-4">
        <h2 className="font-semibold">New workout program</h2>
        <p className="text-sm text-muted">
          Define lifts, default sets/reps, then assign to a weight room section by date. Athletes log sets
          with weight and RPE on their Log workout page.
        </p>
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
          {pending ? "Saving…" : "Save program"}
        </button>
      </form>

      <form onSubmit={assignProgram} className="space-y-3 rounded-2xl border border-card-border bg-card p-4">
        <h2 className="font-semibold">Assign to class</h2>
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
        <button
          type="submit"
          disabled={pending || templates.length === 0 || classes.length === 0}
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
              <li key={t.id} className="rounded-xl border border-card-border bg-card/50 px-4 py-3 text-sm">
                <div className="font-medium">{t.name}</div>
                <div className="mt-1 text-muted">
                  {t.exercises.map((ex) => `${ex.activity.name} ${ex.defaultSets}×${ex.defaultReps}`).join(" · ")}
                </div>
                <div className="mt-1 text-xs text-muted">
                  {t._count.assignments} assignment{t._count.assignments === 1 ? "" : "s"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
