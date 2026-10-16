import type { SessionPayload } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function coachAssignedClassIds(
  coachProfileId: string,
  schoolId: string
): Promise<Set<string>> {
  const rows = await prisma.class.findMany({
    where: {
      schoolId,
      OR: [{ coachId: coachProfileId }, { coachAssignments: { some: { coachId: coachProfileId } } }],
    },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}

export async function coachCanAccessStudent(
  session: SessionPayload & { schoolId?: string },
  studentId: string
): Promise<boolean> {
  if (session.role === "ADMIN") {
    if (!session.schoolId) return false;
    const student = await prisma.studentProfile.findFirst({
      where: { id: studentId, schoolId: session.schoolId },
      select: { id: true },
    });
    return Boolean(student);
  }
  if (session.role !== "COACH" || !session.schoolId) return false;

  const profile = await prisma.coachProfile.findFirst({
    where: { userId: session.userId, schoolId: session.schoolId },
    select: { id: true },
  });
  if (!profile) return false;

  const student = await prisma.studentProfile.findFirst({
    where: { id: studentId, schoolId: session.schoolId },
    select: { id: true },
  });
  if (!student) return false;

  const classIds = await coachAssignedClassIds(profile.id, session.schoolId);
  if (classIds.size === 0) {
    // Coach with no class assignments yet: deny student record access until assigned.
    return false;
  }

  const shared = await prisma.classEnrollment.findFirst({
    where: {
      studentId,
      classId: { in: [...classIds] },
    },
    select: { id: true },
  });
  return Boolean(shared);
}

export async function studentCanAccessOwnRecord(
  session: SessionPayload,
  studentId: string
): Promise<boolean> {
  return session.role === "STUDENT" && session.studentId === studentId;
}

export async function assertCoachOrAdminStudentAccess(
  session: SessionPayload & { schoolId?: string },
  studentId: string
): Promise<{ ok: true } | { ok: false; status: 403 | 404 }> {
  if (session.role === "STUDENT") {
    if (await studentCanAccessOwnRecord(session, studentId)) return { ok: true };
    return { ok: false, status: 403 };
  }
  if (session.role === "ADMIN" || session.role === "COACH") {
    if (!session.schoolId) return { ok: false, status: 403 };
    const student = await prisma.studentProfile.findFirst({
      where: { id: studentId, schoolId: session.schoolId },
      select: { id: true },
    });
    if (!student) return { ok: false, status: 404 };
    if (session.role === "ADMIN") return { ok: true };
    if (await coachCanAccessStudent(session, studentId)) return { ok: true };
    return { ok: false, status: 403 };
  }
  return { ok: false, status: 403 };
}

/** Students under 13 on the COPPA school-consent pathway require ACTIVE school authorization. */
export function isUnder13(dateOfBirth: Date, asOf = new Date()): boolean {
  const threshold = new Date(asOf);
  threshold.setFullYear(threshold.getFullYear() - 13);
  return dateOfBirth > threshold;
}

export async function schoolHasActiveAuthorization(schoolId: string): Promise<boolean> {
  const row = await prisma.schoolAuthorization.findFirst({
    where: { schoolId, status: "ACTIVE", revokedAt: null },
    select: { id: true },
  });
  return Boolean(row);
}

export async function ensureUnder13CollectionAllowed(
  schoolId: string,
  dateOfBirth: Date
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isUnder13(dateOfBirth)) return { ok: true };
  if (await schoolHasActiveAuthorization(schoolId)) return { ok: true };
  return {
    ok: false,
    error:
      "This school has not completed under-13 authorization. A district or school official must activate school authorization before collecting information from students under 13.",
  };
}
