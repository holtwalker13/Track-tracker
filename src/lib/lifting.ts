/** Weight-room workflows: activity presets and class detection. */

export type LiftingSessionActivityMeta = {
  slug: string;
  name: string;
};

/** Absolute and relative lifts used in school weight rooms (matches seed catalog). */
export const LIFTING_SESSION_ACTIVITIES: LiftingSessionActivityMeta[] = [
  { slug: "squat", name: "Back Squat 1RM" },
  { slug: "squat-relative", name: "Back Squat 1RM / BW" },
  { slug: "hang-clean", name: "Hang Clean 1RM" },
  { slug: "hang-clean-relative", name: "Hang Clean 1RM / BW" },
  { slug: "bench-press", name: "Bench Press 1RM" },
  { slug: "pull-ups", name: "Pull-Ups" },
];

export const LIFTING_SESSION_SLUGS = LIFTING_SESSION_ACTIVITIES.map((a) => a.slug);

/** Absolute lifts for daily workout logging (no × BW). */
export const LIFTING_WORKOUT_SLUGS = ["squat", "hang-clean", "bench-press", "pull-ups"] as const;

export function isWeightliftingClassName(name: string): boolean {
  return /weights?|weightlifting|weight room/i.test(name);
}

export function defaultSessionNameForClass(className: string, sameDayCount: number): string {
  const base = isWeightliftingClassName(className) ? "Lifting test" : "Performance Test";
  if (sameDayCount === 0) return base;
  return `${base} (${sameDayCount + 1})`;
}
