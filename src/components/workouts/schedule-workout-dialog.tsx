"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CoachModal } from "@/components/ui/coach-modal";
import {
  ProgramsSetBuilderGrid,
  type AssignLiftDraft,
} from "@/components/workouts/programs-set-builder-grid";
import {
  normalizeSetPrescriptions,
  type SetPrescription,
} from "@/lib/workout-prescriptions";

export type ScheduleTemplate = {
  id: string;
  name: string;
  exercises: {
    defaultSets: number;
    defaultReps: number;
    setPrescriptions?: unknown;
    activity: { slug: string; name: string };
  }[];
};

export function ScheduleWorkoutDialog({
  templates,
  classId,
  scopeLabel,
  subgroupId,
  initialDate,
  initialTemplateId,
  onClose,
}: {
  templates: ScheduleTemplate[];
  classId: string;
  scopeLabel: string;
  subgroupId?: string | null;
  initialDate: string;
  initialTemplateId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(initialTemplateId || templates[0]?.id || "");
  const [date, setDate] = useState(initialDate);
  const [lifts, setLifts] = useState<AssignLiftDraft[]>([]);
  const [bulkPercent, setBulkPercent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function draftFromTemplate(template: ScheduleTemplate | undefined): AssignLiftDraft[] {
    if (!template) return [];
    return template.exercises.map((ex) => ({
      activitySlug: ex.activity.slug,
      name: ex.activity.name,
      sets: normalizeSetPrescriptions(ex.setPrescriptions, ex.defaultSets, ex.defaultReps),
    }));
  }

  useEffect(() => {
    const selected = templates.find((t) => t.id === templateId);
    setLifts(draftFromTemplate(selected));
  }, [templateId, templates]);

  const ready = Boolean(templateId && lifts.length > 0 && classId && date);

  function updateLift(index: number, sets: SetPrescription[]) {
    setLifts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, sets };
      return next;
    });
  }

  function applyBulkPercent() {
    const pct =
      bulkPercent.trim() === "" ? null : Math.min(120, Math.max(1, Number(bulkPercent)));
    if (bulkPercent.trim() !== "" && (pct == null || !Number.isFinite(pct))) return;
    setLifts((prev) =>
      prev.map((lift) => ({
        ...lift,
        sets: lift.sets.map((s) => ({ ...s, percentOf1Rm: pct })),
      }))
    );
  }

  async function schedule() {
    if (!ready) return;
    setPending(true);
    setError(null);
    const patchRes = await fetch(`/api/workouts/templates/${templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exercises: lifts.map((l) => ({
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
    const res = await fetch("/api/workouts/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId,
        classId,
        subgroupId: subgroupId || undefined,
        scheduledDate: date,
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not add workout to schedule");
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <CoachModal
      eyebrow="Schedule"
      title="Add workout to schedule"
      onClose={onClose}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-sport-red">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            Saved workout
            <select
              required
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
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
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
            />
          </label>
        </div>
        <p className="text-xs text-muted">
          Assigning to: <span className="font-medium text-foreground">{scopeLabel}</span>
        </p>
        <ProgramsSetBuilderGrid
          lifts={lifts}
          bulkPercent={bulkPercent}
          onBulkPercentChange={setBulkPercent}
          onApplyBulkPercent={applyBulkPercent}
          onUpdateLift={updateLift}
        />
        <button
          type="button"
          disabled={pending || !ready}
          onClick={() => void schedule()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {pending ? "Scheduling…" : "Add to calendar"}
        </button>
      </div>
    </CoachModal>
  );
}
