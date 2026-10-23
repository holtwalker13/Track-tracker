import { roundToPlate } from "@/lib/services/workout-progression";

/** One set in a workout program (reps + optional % of 1RM). */
export type SetPrescription = {
  reps: number;
  /** Percent of athlete 1RM (e.g. 85). Null = no recommended weight. */
  percentOf1Rm: number | null;
  /** Coach cues for this set when scheduling a workout. */
  notes?: string | null;
};

export function normalizeSetPrescriptions(
  raw: unknown,
  fallbackSets = 3,
  fallbackReps = 5
): SetPrescription[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.slice(0, 20).map((row) => {
      const r = row as { reps?: unknown; percentOf1Rm?: unknown; notes?: unknown };
      const reps = Math.min(50, Math.max(1, Number(r.reps) || fallbackReps));
      const pctRaw = r.percentOf1Rm;
      const pct =
        pctRaw === null || pctRaw === undefined || pctRaw === ""
          ? null
          : Math.min(120, Math.max(1, Number(pctRaw)));
      const notesRaw = r.notes;
      const notes =
        notesRaw == null || notesRaw === ""
          ? null
          : String(notesRaw).trim().slice(0, 500) || null;
      return {
        reps,
        percentOf1Rm: pct != null && Number.isFinite(pct) ? pct : null,
        notes,
      };
    });
  }
  return Array.from({ length: Math.min(20, Math.max(1, fallbackSets)) }, () => ({
    reps: Math.min(50, Math.max(1, fallbackReps)),
    percentOf1Rm: null,
  }));
}

export function prescriptionsFromSetsReps(
  sets: number,
  reps: number,
  percentOf1Rm: number | null = null
): SetPrescription[] {
  return normalizeSetPrescriptions(
    Array.from({ length: sets }, () => ({ reps, percentOf1Rm })),
    sets,
    reps
  );
}

/** Percent of 1RM that projects back to the current 1RM at this rep count (Epley). */
export function percentThatHoldsCurrent1Rm(reps: number): number | null {
  if (!Number.isFinite(reps) || reps <= 0) return null;
  if (reps <= 1) return 100;
  return 100 / (1 + reps / 30);
}

/**
 * How much a prescribed percent changes the projected 1RM versus the athlete's current mark.
 * Positive means a new, higher projection. 6 reps at 90% is about +8.
 */
export function projectionChangePercent(reps: number, percentOf1Rm: number): number | null {
  if (!Number.isFinite(reps) || reps <= 0) return null;
  if (!Number.isFinite(percentOf1Rm) || percentOf1Rm <= 0) return null;
  const factor = reps <= 1 ? 1 : 1 + reps / 30;
  return (percentOf1Rm / 100) * factor * 100 - 100;
}

/** Recommended working weight from a logged 1RM and set intensity. */
export function recommendedWeightFrom1Rm(
  oneRepMaxLb: number | null | undefined,
  percentOf1Rm: number | null | undefined
): number | null {
  if (oneRepMaxLb == null || oneRepMaxLb <= 0) return null;
  if (percentOf1Rm == null || percentOf1Rm <= 0) return null;
  const raw = oneRepMaxLb * (percentOf1Rm / 100);
  const rounded = roundToPlate(raw);
  return rounded > 0 ? rounded : null;
}

export function prescriptionSummary(sets: SetPrescription[]): string {
  if (sets.length === 0) return "";
  const sameReps = sets.every((s) => s.reps === sets[0]!.reps);
  const samePct = sets.every((s) => s.percentOf1Rm === sets[0]!.percentOf1Rm);
  if (sameReps && samePct) {
    const pct = sets[0]!.percentOf1Rm;
    return pct != null
      ? `${sets.length}×${sets[0]!.reps} @ ${pct}%`
      : `${sets.length}×${sets[0]!.reps}`;
  }
  return sets
    .map((s, i) => {
      const pct = s.percentOf1Rm != null ? ` @ ${s.percentOf1Rm}%` : "";
      return `S${i + 1}:${s.reps}${pct}`;
    })
    .join(" · ");
}
