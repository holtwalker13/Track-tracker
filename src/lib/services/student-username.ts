import { prisma } from "@/lib/db";
import { DEFAULT_CLASS_YEAR } from "@/lib/grades";

/** e.g. Jane Smith, 2028 → jsmith2028 */
export function buildStudentUsernameBase(
  firstName: string,
  lastName: string,
  classYear: number
): string {
  const initial = firstName.trim().charAt(0).toLowerCase();
  const last = lastName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const year = String(classYear);
  if (!initial || !last) return `student${year}`;
  return `${initial}${last}${year}`;
}

export function usernamePlaceholderHint(firstName: string, lastName: string, classYear: number) {
  return buildStudentUsernameBase(firstName, lastName, classYear);
}

export async function pickUniqueUsername(
  schoolId: string,
  base: string,
  excludeStudentId?: string
): Promise<string> {
  const normalized = base.toLowerCase().replace(/[^a-z0-9]/g, "") || "student";
  let candidate = normalized;
  let n = 2;
  while (true) {
    const clash = await prisma.studentProfile.findFirst({
      where: {
        schoolId,
        username: candidate,
        ...(excludeStudentId ? { id: { not: excludeStudentId } } : {}),
      },
      select: { id: true },
    });
    if (!clash) return candidate;
    candidate = `${normalized}${n}`;
    n += 1;
  }
}

export async function classYearForStudent(studentId: string): Promise<number> {
  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId, schoolYear: { isCurrent: true } },
    orderBy: { gradeLevel: "desc" },
    select: { gradeLevel: true },
  });
  return enrollment?.gradeLevel ?? DEFAULT_CLASS_YEAR;
}

export async function ensureStudentUsername(studentId: string): Promise<string> {
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    select: { id: true, schoolId: true, username: true, firstName: true, lastName: true },
  });
  if (!student) throw new Error("Student not found");
  if (student.username) return student.username;

  const classYear = await classYearForStudent(studentId);
  const base = buildStudentUsernameBase(student.firstName, student.lastName, classYear);
  const username = await pickUniqueUsername(student.schoolId, base, student.id);
  await prisma.studentProfile.update({
    where: { id: studentId },
    data: { username },
  });
  return username;
}

/** Idempotent backfill for all profiles missing username. */
export async function backfillStudentUsernamesForSchool(schoolId: string): Promise<number> {
  const missing = await prisma.studentProfile.findMany({
    where: { schoolId, username: null },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  let count = 0;
  for (const row of missing) {
    await ensureStudentUsername(row.id);
    count += 1;
  }
  return count;
}

export async function backfillAllStudentUsernames(): Promise<number> {
  const schools = await prisma.school.findMany({ select: { id: true } });
  let total = 0;
  for (const school of schools) {
    total += await backfillStudentUsernamesForSchool(school.id);
  }
  return total;
}
