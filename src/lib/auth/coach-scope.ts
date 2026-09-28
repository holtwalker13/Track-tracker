import type { SessionPayload } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export type CoachProfileRow = { id: string; userId: string; schoolId: string };

export async function coachProfileForSession(
  session: SessionPayload & { schoolId?: string }
): Promise<CoachProfileRow | null> {
  if (session.role !== "COACH" || !session.schoolId) return null;
  const row = await prisma.coachProfile.findFirst({
    where: { userId: session.userId, schoolId: session.schoolId },
    select: { id: true, userId: true, schoolId: true },
  });
  return row;
}

export async function coachCanAdministerTestsForClass(
  session: SessionPayload & { schoolId?: string },
  classId: string
): Promise<boolean> {
  if (session.role === "ADMIN") return true;
  if (!session.schoolId) return false;

  const profile = await coachProfileForSession(session);
  if (!profile) return false;

  const cls = await prisma.class.findFirst({
    where: { id: classId, schoolId: session.schoolId },
    select: { coachId: true },
  });
  if (!cls) return false;
  return cls.coachId === profile.id;
}

/** Manage roster / metadata for a class (claim unassigned classes by setting coachId). */
export async function coachCanManageClass(
  session: SessionPayload & { schoolId?: string },
  classId: string
): Promise<boolean> {
  if (session.role === "ADMIN") return true;
  if (!session.schoolId) return false;

  const profile = await coachProfileForSession(session);
  if (!profile) return false;

  const cls = await prisma.class.findFirst({
    where: { id: classId, schoolId: session.schoolId },
    select: { coachId: true },
  });
  if (!cls) return false;
  if (cls.coachId == null) return true;
  return cls.coachId === profile.id;
}

export async function claimClassForCoach(classId: string, coachProfileId: string) {
  return prisma.class.updateMany({
    where: { id: classId, coachId: null },
    data: { coachId: coachProfileId },
  });
}

export async function coachCanAdministerTestingSession(
  session: SessionPayload & { schoolId?: string },
  testingSessionId: string
): Promise<boolean> {
  if (session.role === "ADMIN") return true;
  if (!session.schoolId) return false;

  const rec = await prisma.testingSession.findFirst({
    where: { id: testingSessionId, schoolId: session.schoolId },
    select: { classId: true },
  });
  if (!rec?.classId) return false;
  return coachCanAdministerTestsForClass(session, rec.classId);
}
