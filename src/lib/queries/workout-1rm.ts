import {
  normalizeSetPrescriptions,
  recommendedWeightFrom1Rm,
  type SetPrescription,
} from "@/lib/workout-prescriptions";
import { suggestWorkingWeight } from "@/lib/services/workout-progression";
import { getRecentLiftHistory } from "@/lib/queries/workout-logs";
import { resolveStudentLiftOneRepMax } from "@/lib/queries/student-core-one-rep-max";

/** Effective 1RM (lb): best tested mark, else coach core starting point. */
export async function getStudentLiftOneRepMax(
  studentId: string,
  activitySlug: string
): Promise<number | null> {
  const resolved = await resolveStudentLiftOneRepMax(studentId, activitySlug);
  return resolved.value;
}

export type ExerciseWithPrescription = {
  id: string;
  defaultSets: number;
  defaultReps: number;
  setPrescriptions?: unknown;
  activity: { slug: string };
};

/**
 * Per-set recommended weights keyed by `exerciseId:setNumber`.
 * Prefer % of logged 1RM from the program; fall back to RPE history for set 1 only
 * when the program has no % prescribed.
 */
export async function suggestWeightsForPrescribedSets(
  studentId: string,
  exercises: ExerciseWithPrescription[]
): Promise<Record<string, number | null>> {
  const out: Record<string, number | null> = {};

  for (const ex of exercises) {
    const sets = normalizeSetPrescriptions(ex.setPrescriptions, ex.defaultSets, ex.defaultReps);
    const oneRm = await getStudentLiftOneRepMax(studentId, ex.activity.slug);
    let historyFallback: number | null = null;

    for (let i = 0; i < sets.length; i++) {
      const setNumber = i + 1;
      const key = `${ex.id}:${setNumber}`;
      const pct = sets[i]!.percentOf1Rm;
      const from1Rm = recommendedWeightFrom1Rm(oneRm, pct);
      if (from1Rm != null) {
        out[key] = from1Rm;
        continue;
      }
      if (pct == null && setNumber === 1) {
        if (historyFallback === null) {
          const history = await getRecentLiftHistory(studentId, ex.activity.slug);
          historyFallback = suggestWorkingWeight(history, sets[i]!.reps, 8);
        }
        out[key] = historyFallback;
      } else {
        out[key] = null;
      }
    }
  }

  return out;
}

export function serializeExercisePrescriptions(ex: {
  defaultSets: number;
  defaultReps: number;
  setPrescriptions: unknown;
}): SetPrescription[] {
  return normalizeSetPrescriptions(ex.setPrescriptions, ex.defaultSets, ex.defaultReps);
}
