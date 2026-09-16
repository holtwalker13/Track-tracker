import type { ScoringDirection } from "@/lib/constants";

export function formatActivityValue(
  value: number,
  unit: string,
  activitySlug?: string
): string {
  if (unit === "inches" && (activitySlug === "standing-broad-jump" || activitySlug === "vertical-jump")) {
    const feet = Math.floor(value / 12);
    const inches = Math.round(value % 12);
    if (feet > 0) return `${feet}'${inches}"`;
    return `${Math.round(value)}"`;
  }
  if (unit === "seconds") return `${value.toFixed(2)} sec`;
  if (unit === "reps" || unit === "count") return `${Math.round(value)}`;
  if (unit === "lb") return `${value.toFixed(1)} lb`;
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
