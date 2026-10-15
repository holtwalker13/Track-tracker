import { studentLoginEmailForNumber } from "@/lib/services/student-login-invite";

/** Roster identity a student can type on a class link: email, username, or student ID. */
export function credentialMatchesRosterStudent(input: {
  credential: string;
  studentNumber: string;
  username: string | null;
  userEmail: string | null;
  schoolSlug: string;
}): boolean {
  const raw = input.credential.trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  if (input.username && input.username.toLowerCase() === lower) return true;
  if (input.studentNumber.toLowerCase() === lower) return true;
  if (input.userEmail && input.userEmail.toLowerCase() === lower) return true;
  return studentLoginEmailForNumber(input.studentNumber, input.schoolSlug).toLowerCase() === lower;
}
