import { SessionPayload } from "./session";

export function canViewStudentIdentity(
  session: SessionPayload,
  studentSchoolId: string,
  studentId?: string
): boolean {
  if (session.role === "ADMIN") return session.schoolId === studentSchoolId;
  if (session.role === "COACH") return session.schoolId === studentSchoolId;
  if (session.role === "STUDENT") {
    return session.schoolId === studentSchoolId && (!studentId || session.studentId === studentId);
  }
  return false;
}

/** Synchronous guard for same-school checks. Use tenant-access.coachCanAccessStudent for coach class scope. */
export function canAccessStudentRecord(
  session: SessionPayload,
  studentId: string,
  studentSchoolId: string
): boolean {
  if (session.role === "ADMIN") return session.schoolId === studentSchoolId;
  if (session.role === "COACH" && session.schoolId === studentSchoolId) return true;
  if (session.role === "STUDENT" && session.studentId === studentId) return true;
  return false;
}

export function leaderboardDisplayName(
  session: SessionPayload,
  student: { id: string; firstName: string; lastName: string; anonymousId: string },
  showNamesForStudents: boolean
): string {
  if (session.role === "COACH" || session.role === "ADMIN") {
    return `${student.firstName} ${student.lastName}`;
  }
  if (session.studentId === student.id) return "You";
  if (showNamesForStudents) return `${student.firstName} ${student.lastName}`;
  return `Student ${student.anonymousId}`;
}
