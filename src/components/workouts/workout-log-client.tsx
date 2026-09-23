"use client";

import { useCallback, useMemo, useState } from "react";

type Exercise = {
  id: string;
  defaultSets: number;
  defaultReps: number;
  notes: string | null;
  activity: { slug: string; name: string; unit: string };
};

type SetLog = {
  templateExerciseId: string;
  setNumber: number;
  weightLb: number | null;
  reps: number | null;
  rpe: number | null;
  skipped: boolean;
};

type Payload = {
  date: string;
  assignment: {
    id: string;
    className: string | null;
    template: { id: string; name: string; exercises: Exercise[] };
  } | null;
  session: {
    id: string;
    status: string;
    completedAt: string | null;
    setLogs: SetLog[];
  } | null;
  suggestedWeightLb?: Record<string, number | null>;
};

type CellState = {
  weightLb: string;
  reps: string;
  rpe: string;
  skipped: boolean;
};

function cellKey(exerciseId: string, setNumber: number) {
  return `${exerciseId}:${setNumber}`;
}

function buildInitialCells(
  exercises: Exercise[],
  logs: SetLog[],
  suggestedWeightLb?: Record<string, number | null>
): Map<string, CellState> {
  const map = new Map<string, CellState>();
  for (const ex of exercises) {
    const suggestion = suggestedWeightLb?.[ex.id];
    for (let n = 1; n <= ex.defaultSets; n++) {
      const log = logs.find((l) => l.templateExerciseId === ex.id && l.setNumber === n);
      let weight = log?.weightLb != null ? String(log.weightLb) : "";
      if (!weight && n === 1 && suggestion != null) weight = String(suggestion);
      map.set(cellKey(ex.id, n), {
        weightLb: weight,
        reps: log?.reps != null ? String(log.reps) : String(ex.defaultReps),
        rpe: log?.rpe != null ? String(log.rpe) : "",
        skipped: log?.skipped ?? false,
      });
    }
  }
  return map;
}

export function WorkoutLogClient({
  initial,
  coachMeta,
}: {
  initial: Payload;
  coachMeta?: { studentName: string; studentNumber: string };
}) {
  const [data, setData] = useState(initial);
  const [cells, setCells] = useState(() =>
    initial.assignment && initial.session
      ? buildInitialCells(
          initial.assignment.template.exercises,
          initial.session.setLogs,
          initial.suggestedWeightLb
        )
      : new Map()
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const readOnly = data.session?.status === "COMPLETED";

  const exercises = data.assignment?.template.exercises ?? [];

  const allSetsPayload = useMemo(() => {
    const sets: {
      templateExerciseId: string;
      setNumber: number;
      weightLb: number | null;
      reps: number | null;
      rpe: number | null;
      skipped: boolean;
    }[] = [];
    for (const ex of exercises) {
      for (let n = 1; n <= ex.defaultSets; n++) {
        const c = cells.get(cellKey(ex.id, n));
        if (!c) continue;
        sets.push({
          templateExerciseId: ex.id,
          setNumber: n,
          skipped: c.skipped,
          weightLb: c.skipped || c.weightLb === "" ? null : Number(c.weightLb),
          reps: c.skipped || c.reps === "" ? null : Number(c.reps),
          rpe: c.skipped || c.rpe === "" ? null : Number(c.rpe),
        });
      }
    }
    return sets;
  }, [cells, exercises]);

  const updateCell = useCallback(
    (exerciseId: string, setNumber: number, patch: Partial<CellState>) => {
      setCells((prev) => {
        const next = new Map(prev);
        const key = cellKey(exerciseId, setNumber);
        const cur = next.get(key) ?? { weightLb: "", reps: "", rpe: "", skipped: false };
        next.set(key, { ...cur, ...patch });
        return next;
      });
    },
    []
  );

  async function saveDraft() {
    if (!data.session) return;
    setPending(true);
    setError(null);
    const res = await fetch(`/api/workouts/sessions/${data.session.id}/sets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sets: allSetsPayload }),
    });
    const body = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(body.error ?? "Could not save");
      return;
    }
    setSavedAt(new Date().toLocaleTimeString());
  }

  async function submitWorkout() {
    if (!data.session) return;
    setPending(true);
    setError(null);
    const saveRes = await fetch(`/api/workouts/sessions/${data.session.id}/sets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sets: allSetsPayload }),
    });
    if (!saveRes.ok) {
      const body = await saveRes.json();
      setPending(false);
      setError(body.error ?? "Could not save sets");
      return;
    }
    const res = await fetch(`/api/workouts/sessions/${data.session.id}/complete`, {
      method: "POST",
    });
    const body = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(body.error ?? "Could not submit");
      return;
    }
    setData((d) =>
      d.session
        ? {
            ...d,
            session: {
              ...d.session,
              status: "COMPLETED",
              completedAt: new Date().toISOString(),
            },
          }
        : d
    );
  }

  if (!data.assignment || !data.session) {
    return (
      <div className="rounded-2xl border border-card-border bg-card p-6 text-center">
        <p className="font-medium">No workout assigned for today</p>
        <p className="mt-2 text-sm text-muted">
          Your coach assigns programs to your class by date. Check back after they publish today&apos;s
          session.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{data.assignment.template.name}</h1>
        <p className="text-sm text-muted">
          {coachMeta ? `${coachMeta.studentName} (#${coachMeta.studentNumber}) · ` : ""}
          {data.date}
          {data.assignment.className ? ` · ${data.assignment.className}` : ""}
          {readOnly ? " · Submitted" : ""}
        </p>
      </div>

      {error && <p className="text-sm text-sport-red">{error}</p>}
      {savedAt && !readOnly && (
        <p className="text-xs text-muted">Draft saved at {savedAt}</p>
      )}

      {exercises.map((ex) => (
        <section key={ex.id} className="rounded-2xl border border-card-border bg-card p-4">
          <h2 className="font-semibold">{ex.activity.name}</h2>
          <p className="text-sm text-muted">
            Target {ex.defaultSets}×{ex.defaultReps}
            {data.suggestedWeightLb?.[ex.id] != null
              ? ` · Suggested ${data.suggestedWeightLb[ex.id]} lb (from last logs @ RPE 8)`
              : ""}
            {ex.notes ? ` · ${ex.notes}` : ""}
          </p>
          <div className="mt-3 space-y-2">
            {Array.from({ length: ex.defaultSets }, (_, i) => i + 1).map((setNum) => {
              const c = cells.get(cellKey(ex.id, setNum)) ?? {
                weightLb: "",
                reps: String(ex.defaultReps),
                rpe: "",
                skipped: false,
              };
              return (
                <div
                  key={setNum}
                  className="flex flex-wrap items-end gap-2 border-t border-card-border/50 pt-2 first:border-0 first:pt-0"
                >
                  <span className="w-10 text-sm font-medium text-muted">#{setNum}</span>
                  <label className="text-xs">
                    Weight (lb)
                    <input
                      type="number"
                      min={0}
                      step={2.5}
                      disabled={readOnly || c.skipped}
                      value={c.weightLb}
                      onChange={(e) => updateCell(ex.id, setNum, { weightLb: e.target.value })}
                      className="mt-0.5 block w-24 rounded border border-card-border bg-background px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    Reps
                    <input
                      type="number"
                      min={0}
                      disabled={readOnly || c.skipped}
                      value={c.reps}
                      onChange={(e) => updateCell(ex.id, setNum, { reps: e.target.value })}
                      className="mt-0.5 block w-16 rounded border border-card-border bg-background px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    RPE
                    <input
                      type="number"
                      min={6}
                      max={10}
                      step={0.5}
                      disabled={readOnly || c.skipped}
                      value={c.rpe}
                      placeholder="6–10"
                      onChange={(e) => updateCell(ex.id, setNum, { rpe: e.target.value })}
                      className="mt-0.5 block w-16 rounded border border-card-border bg-background px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="flex items-center gap-1 pb-1.5 text-xs">
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={c.skipped}
                      onChange={(e) => updateCell(ex.id, setNum, { skipped: e.target.checked })}
                    />
                    Skip
                  </label>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {!readOnly && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => void saveDraft()}
            className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Save draft
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void submitWorkout()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {pending ? "Submitting…" : coachMeta ? "Submit for athlete" : "Submit workout"}
          </button>
        </div>
      )}
    </div>
  );
}
