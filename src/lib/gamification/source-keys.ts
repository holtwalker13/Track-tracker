/** Stable idempotency keys for XP awards (unique in XpTransaction.sourceKey). */
export const gamificationSourceKeys = {
  workoutComplete: (sessionId: string) => `workout-complete:${sessionId}`,
  allSets: (sessionId: string) => `all-sets:${sessionId}`,
  pr: (sessionId: string, activityId: string) => `pr:${sessionId}:${activityId}`,
  liftImproved: (sessionId: string, activityId: string) =>
    `lift-improved:${sessionId}:${activityId}`,
  perfectWeek: (studentId: string, weekKey: string) =>
    `perfect-week:${studentId}:${weekKey}`,
  milestoneWorkouts: (studentId: string, count: number) =>
    `milestone-workouts-${count}:${studentId}`,
};
