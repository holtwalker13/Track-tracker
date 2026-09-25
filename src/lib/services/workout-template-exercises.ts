/** Helpers shared by workout template create/update APIs. */

import { normalizeSetPrescriptions, type SetPrescription } from "@/lib/workout-prescriptions";

export type ExerciseInput = {
  activitySlug: string;
  defaultSets?: number;
  defaultReps?: number;
  setPrescriptions?: unknown;
  notes?: string;
};

export function parseExerciseInput(e: ExerciseInput): {
  defaultSets: number;
  defaultReps: number;
  setPrescriptions: SetPrescription[];
  notes: string | null;
} {
  let prescriptions: SetPrescription[];
  if (Array.isArray(e.setPrescriptions) && e.setPrescriptions.length > 0) {
    prescriptions = normalizeSetPrescriptions(e.setPrescriptions);
  } else {
    const sets = Math.min(20, Math.max(1, Number(e.defaultSets) || 3));
    const reps = Math.min(50, Math.max(1, Number(e.defaultReps) || 5));
    prescriptions = normalizeSetPrescriptions(undefined, sets, reps);
  }
  return {
    defaultSets: prescriptions.length,
    defaultReps: prescriptions[0]?.reps ?? 5,
    setPrescriptions: prescriptions,
    notes: e.notes ? String(e.notes).trim() : null,
  };
}
