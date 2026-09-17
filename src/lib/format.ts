import type { ScoringDirection } from "@/lib/constants";

export function formatActivityValue(
  value: number,
  unit: string,
  activitySlug?: string
): string {
  if (unit === "inches" && (activitySlug === "standing-broad-jump" || activitySlug === "vertical-jump")) {
    if (activitySlug === "vertical-jump") {
      return Number.isInteger(value) ? `${value}"` : `${value.toFixed(1)}"`;
    }
    const feet = Math.floor(value / 12);
    const inches = Math.round(value % 12);
    if (feet > 0) return `${feet}'${inches}"`;
    return `${Math.round(value)}"`;
  }
  if (unit === "x BW") return `${value.toFixed(2)}×`;
  if (unit === "seconds") {
    const digits =
      activitySlug?.startsWith("flying-10") || (value > 0 && value < 2) ? 3 : 2;
    return `${value.toFixed(digits)} s`;
  }
  if (unit === "reps" || unit === "count") return `${Math.round(value)}`;
  if (unit === "lb") return `${Math.round(value)} lb`;
  if (unit === "in") return `${value.toFixed(1)}"`;
  return `${value} ${unit}`;
}

export function isBetter(
  newVal: number,
  oldVal: number,
  direction: ScoringDirection
): boolean {
  if (direction === "HIGHER_BETTER") return newVal > oldVal;
  return newVal < oldVal;
}

export function bestOf(values: number[], direction: ScoringDirection): number | null {
  const valid = values.filter((v) => !Number.isNaN(v));
  if (valid.length === 0) return null;
  if (direction === "HIGHER_BETTER") return Math.max(...valid);
  return Math.min(...valid);
}

export function ageAtDate(dob: Date, at: Date): number {
  const ms = at.getTime() - dob.getTime();
  return ms / (365.25 * 24 * 60 * 60 * 1000);
}
