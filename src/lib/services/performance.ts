import type { ScoringDirection } from "@/lib/constants";
import { bestOf, isBetter } from "@/lib/format";

export function calculateImprovement(
  current: number,
  previous: number,
  direction: ScoringDirection
): { absolute: number; percent: number | null } {
  const absolute =
    direction === "HIGHER_BETTER" ? current - previous : previous - current;
  if (previous === 0) return { absolute, percent: null };
  const percent =
    direction === "HIGHER_BETTER"
      ? ((current - previous) / Math.abs(previous)) * 100
      : ((previous - current) / Math.abs(previous)) * 100;
  return { absolute, percent };
}

export function calculateRelativeStrength(
  liftWeight: number,
  bodyWeight: number
): number | null {
  if (!bodyWeight || bodyWeight <= 0) return null;
  return liftWeight / bodyWeight;
}

export function calculatePersonalRecord(
  candidate: number,
  previousBest: number | null,
  direction: ScoringDirection
): boolean {
  if (previousBest === null) return true;
  return isBetter(candidate, previousBest, direction);
}

export function pickBestAttempt(
  attempts: number[],
  direction: ScoringDirection
): number | null {
  return bestOf(attempts, direction);
}

export function validateRealisticValue(
  value: number,
  min?: number | null,
  max?: number | null
): { ok: boolean; warning?: string } {
  if (min != null && value < min) {
    return { ok: false, warning: `Value below realistic minimum (${min})` };
  }
  if (max != null && value > max) {
    return { ok: false, warning: `Value above realistic maximum (${max})` };
  }
  return { ok: true };
}
