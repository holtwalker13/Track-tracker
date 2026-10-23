/** Display label for roster-hidden students on leaderboards and Compete. */
export const HIDDEN_STUDENT_LEADERBOARD_LABEL = "hidden student";

export function isHiddenStudentLeaderboardLabel(displayName: string): boolean {
  return displayName === HIDDEN_STUDENT_LEADERBOARD_LABEL;
}
