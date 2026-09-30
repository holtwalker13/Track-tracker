export const XP = {
  WORKOUT_COMPLETE: 100,
  ALL_SETS_COMPLETE: 25,
  NEW_PR: 50,
  PERFECT_TRAINING_WEEK: 75,
  LIFT_IMPROVED: 20,
  MAJOR_MILESTONE: 100,
} as const;

export type XpReason = keyof typeof XP;

export const XP_REASON_LABELS: Record<XpReason, string> = {
  WORKOUT_COMPLETE: "Workout Completed",
  ALL_SETS_COMPLETE: "Every Set Completed",
  NEW_PR: "New Personal Record",
  PERFECT_TRAINING_WEEK: "Perfect Training Week",
  LIFT_IMPROVED: "Lift Improved",
  MAJOR_MILESTONE: "Major Milestone",
};

/** Flat 1,000 XP per level band (level 1 = 0–999, level 2 = 1000–1999, …). */
export const XP_PER_LEVEL = 1000;

export function levelFromLifetimeXp(lifetimeXp: number): number {
  return Math.floor(lifetimeXp / XP_PER_LEVEL) + 1;
}

export function levelProgress(lifetimeXp: number): {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
} {
  const level = levelFromLifetimeXp(lifetimeXp);
  const xpIntoLevel = lifetimeXp % XP_PER_LEVEL;
  return { level, xpIntoLevel, xpForNextLevel: XP_PER_LEVEL };
}
