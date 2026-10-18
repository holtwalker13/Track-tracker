/** Result of looking up who already owns a login email. */
export type UserRowForEmailClaim = {
  id: string;
  role: string;
  studentProfile: { id: string } | null;
  coachProfile: { id: string } | null;
};

/**
 * Whether an existing User row blocks claiming this email for a roster student.
 * Returns an error message, or null if staging may proceed (including orphan rows).
 */
export function rosterEmailClaimConflict(
  taken: UserRowForEmailClaim | null,
  student: { id: string; userId: string | null }
): string | null {
  if (!taken) return null;
  if (student.userId && taken.id === student.userId) return null;
  if (taken.studentProfile?.id === student.id) return null;
  if (taken.coachProfile) {
    return "That email is used for a coach login. Use a different email on your roster for this student.";
  }
  if (taken.role === "ADMIN") {
    return "That email is used for an admin login. Use a different email on your roster.";
  }
  if (taken.studentProfile) {
    return "That email is already tied to another student. Ask your coach to fix the duplicate roster email.";
  }
  return null;
}
