/** Estimated 1RM (Epley). */
export function epleyE1rm(weightLb: number, reps: number): number {
  if (weightLb <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightLb;
  return weightLb * (1 + reps / 30);
}

/** Approximate intensity factor for a given RPE at ~5 reps (linear 6–10 scale). */
export function rpeIntensityFactor(rpe: number): number {
  const clamped = Math.min(10, Math.max(6, rpe));
  return 0.76 + (clamped - 6) * 0.06;
}

export function roundToPlate(weightLb: number, increment = 5): number {
  if (weightLb <= 0) return 0;
  return Math.round(weightLb / increment) * increment;
}

export type LiftLogSample = {
  weightLb: number;
  reps: number;
  rpe: number | null;
};

/**
 * Suggest working weight for target reps at target RPE (default 8),
 * using the best e1RM from recent sets and last-session RPE trend.
 */
export function suggestWorkingWeight(
  history: LiftLogSample[],
  targetReps: number,
  targetRpe = 8
): number | null {
  const usable = history.filter((h) => h.weightLb > 0 && h.reps > 0);
  if (usable.length === 0) return null;

  let bestE1rm = 0;
  let lastSet: LiftLogSample | null = null;
  for (const h of usable) {
    const e = epleyE1rm(h.weightLb, h.reps);
    if (e > bestE1rm) bestE1rm = e;
    lastSet = h;
  }
  if (bestE1rm <= 0) return null;

  const targetFactor = rpeIntensityFactor(targetRpe);
  const denom = 1 + targetReps / 30;
  let weight = (bestE1rm / denom) * targetFactor;

  if (lastSet?.rpe != null) {
    if (lastSet.rpe <= 7) weight += 5;
    else if (lastSet.rpe >= 9.5) weight -= 5;
  }

  const rounded = roundToPlate(weight);
  return rounded > 0 ? rounded : null;
}
