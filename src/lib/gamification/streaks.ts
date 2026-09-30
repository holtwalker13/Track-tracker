export type AssignmentCompletionRow = {
  assignmentId: string;
  scheduledDate: Date;
  completed: boolean;
};

/** Longest run of consecutive assigned workouts all completed (chronological order). */
export function longestWorkoutStreak(rows: AssignmentCompletionRow[]): number {
  let best = 0;
  let run = 0;
  for (const row of rows) {
    if (row.completed) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}

/** Streak from the most recent assignment backward until the first incomplete assignment. */
export function currentWorkoutStreak(rows: AssignmentCompletionRow[]): number {
  const desc = [...rows].sort(
    (a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime()
  );
  let streak = 0;
  for (const row of desc) {
    if (!row.completed) break;
    streak += 1;
  }
  return streak;
}
