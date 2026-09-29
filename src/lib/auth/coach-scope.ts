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

async function classCoachIds(classId: string, schoolId: string) {
  const cls = await prisma.class.findFirst({
    where: { id: classId, schoolId },
    select: {
      coachId: true,
      coachAssignments: { select: { coachId: true } },
    },
  });
  if (!cls) return null;
  const ids = new Set<string>();
  if (cls.coachId) ids.add(cls.coachId);
  for (const a of cls.coachAssignments) ids.add(a.coachId);
  return ids;
}

export async function coachCanAdministerTestsForClass(
  session: SessionPayload & { schoolId?: string },
  classId: string
): Promise<boolean> {
  if (session.role === "ADMIN") return true;
  if (!session.schoolId) return false;

  const profile = await coachProfileForSession(session);
  if (!profile) return false;

  const ids = await classCoachIds(classId, session.schoolId);
  if (!ids) return false;
  return ids.has(profile.id);
}

/** Manage roster / metadata for a class (claim unassigned classes by setting coach). */
export async function coachCanManageClass(
  session: SessionPayload & { schoolId?: string },
  classId: string
): Promise<boolean> {
  if (session.role === "ADMIN") return true;
  if (!session.schoolId) return false;

  const profile = await coachProfileForSession(session);
  if (!profile) return false;

  const ids = await classCoachIds(classId, session.schoolId);
  if (!ids) return false;
  if (ids.size === 0) return true;
  return ids.has(profile.id);
}

export async function claimClassForCoach(classId: string, coachProfileId: string) {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { coachId: true, _count: { select: { coachAssignments: true } } },
  });
  if (!cls) return { count: 0 };
  if (cls.coachId != null || cls._count.coachAssignments > 0) return { count: 0 };

  await prisma.$transaction([
    prisma.class.update({
      where: { id: classId },
      data: { coachId: coachProfileId },
    }),
    prisma.classCoach.create({
      data: { classId, coachId: coachProfileId },
    }),
  ]);
  return { count: 1 };
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
