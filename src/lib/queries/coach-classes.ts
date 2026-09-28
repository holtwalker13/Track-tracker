import type { SessionPayload } from "@/lib/auth/session";
import { coachProfileForSession } from "@/lib/auth/coach-scope";
import { prisma } from "@/lib/db";

export async function classesForCoachTesting(
  session: SessionPayload & { schoolId: string }
) {
  if (session.role === "ADMIN") {
    return prisma.class.findMany({
      where: { schoolId: session.schoolId },
      orderBy: [{ period: "asc" }, { name: "asc" }],
      select: { id: true, name: true, period: true, programKind: true, coachId: true },
    });
  }

  const profile = await coachProfileForSession(session);
  if (!profile) return [];

  return prisma.class.findMany({
    where: { schoolId: session.schoolId, coachId: profile.id },
    orderBy: [{ period: "asc" }, { name: "asc" }],
    select: { id: true, name: true, period: true, programKind: true, coachId: true },
  });
}

export async function testingSessionsForCoachView(session: SessionPayload & { schoolId: string }) {
  const baseInclude = {
    schoolYear: true,
    activities: {
      include: { activity: true },
      orderBy: { sortOrder: "asc" as const },
    },
    class: true,
    students: {
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    },
    results: {
      where: { status: { not: "SUPERSEDED" as const } },
      select: {
        studentId: true,
        activityId: true,
        status: true,
        resultValue: true,
        displayValue: true,
        isBestAttempt: true,
      },
    },
  };

  if (session.role === "ADMIN") {
    return prisma.testingSession.findMany({
      where: { schoolId: session.schoolId },
      include: baseInclude,
      orderBy: { testingDate: "desc" },
    });
  }

  const profile = await coachProfileForSession(session);
  if (!profile) return [];

  return prisma.testingSession.findMany({
    where: {
      schoolId: session.schoolId,
      class: { coachId: profile.id },
    },
    include: baseInclude,
    orderBy: { testingDate: "desc" },
  });
}
