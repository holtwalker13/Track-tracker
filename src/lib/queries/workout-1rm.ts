import { prisma } from "@/lib/db";
import {
  normalizeSetPrescriptions,
  recommendedWeightFrom1Rm,
  type SetPrescription,
} from "@/lib/workout-prescriptions";
import { suggestWorkingWeight } from "@/lib/services/workout-progression";
import { getRecentLiftHistory } from "@/lib/queries/workout-logs";

/** Best absolute 1RM (lb) from formal testing / workout-synced performance rows. */
export async function getStudentLiftOneRepMax(
  studentId: string,
  activitySlug: string
): Promise<number | null> {
  const activity = await prisma.activity.findUnique({
    where: { slug: activitySlug },
    select: { id: true, unit: true },
  });
  if (!activity || activity.unit !== "lb") return null;

  const best = await prisma.performanceResult.findFirst({
    where: {
      studentId,
      activityId: activity.id,
      status: "COMPLETED",
      isBestAttempt: true,
      resultValue: { not: null },
    },
    orderBy: { resultValue: "desc" },
    select: { resultValue: true },
  });

  return best?.resultValue != null && best.resultValue > 0 ? best.resultValue : null;
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
