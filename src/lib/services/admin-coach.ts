import { prisma } from "@/lib/db";
import {
  coachLoginStatusFromRow,
  createOrRefreshCoachLoginInvite,
  placeholderPasswordHash,
} from "@/lib/services/coach-login-invite";

export type CreateSchoolCoachInput = {
  schoolId: string;
  email: string;
  firstName: string;
  lastName: string;
  createdByUserId?: string;
};

export async function createSchoolCoach(input: CreateSchoolCoachInput) {
  const email = input.email.toLowerCase().trim();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!email.includes("@")) throw new Error("Valid email is required");
  if (!firstName || !lastName) throw new Error("First and last name are required");

  const school = await prisma.school.findUnique({ where: { id: input.schoolId }, select: { id: true } });
  if (!school) throw new Error("School not found");

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new Error("Email is already in use");

  const passwordHash = await placeholderPasswordHash();

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "COACH",
      firstName,
      lastName,
      passwordSetAt: null,
    },
  });

  const profile = await prisma.coachProfile.create({
    data: { userId: user.id, schoolId: input.schoolId },
  });

  const invite = await createOrRefreshCoachLoginInvite(profile.id, input.createdByUserId);

  return {
    userId: user.id,
    coachProfileId: profile.id,
    email,
    urlPath: invite.urlPath,
    expiresAt: invite.expiresAt.toISOString(),
  };
}

/**
 * Remove a coach from the school: deletes their login (User) and coach
 * profile. Classes they led stay (lead coach cleared); results they entered
 * keep their marks (enteredBy nulled). Their KPI sets are reassigned to
 * another coach at the school when one exists so class/school KPI
 * configuration survives the coach's departure.
 */
export async function deleteSchoolCoach(input: {
  schoolId: string;
  coachProfileId: string;
  actingUserId: string;
}) {
  const coach = await prisma.coachProfile.findFirst({
    where: { id: input.coachProfileId, schoolId: input.schoolId },
    include: { user: { select: { id: true, email: true, role: true } } },
  });
  if (!coach) throw new Error("Coach not found");
  if (coach.userId === input.actingUserId) {
    throw new Error("You can't delete the account you're signed in with");
  }

  const fallbackCoach = await prisma.coachProfile.findFirst({
    where: { schoolId: input.schoolId, id: { not: coach.id } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    if (fallbackCoach) {
      await tx.kpiSet.updateMany({
        where: { coachProfileId: coach.id },
        data: { coachProfileId: fallbackCoach.id },
      });
    }
    // FK cascades remove the coach profile, class assignments, and login
    // invite; Class.coachId / PerformanceResult.enteredById /
    // WorkoutTemplate.createdById / WorkoutAssignment.createdById are SET NULL.
    await tx.user.delete({ where: { id: coach.userId } });
  });

  return { email: coach.user.email };
}

export async function listSchoolCoaches(schoolId: string) {
  const rows = await prisma.coachProfile.findMany({
    where: { schoolId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          passwordSetAt: true,
        },
      },
      loginInvite: { select: { usedAt: true, expiresAt: true } },
      classes: { select: { id: true, name: true, programKind: true } },
    },
    orderBy: { user: { lastName: "asc" } },
  });
  return rows.map((r) => ({
    coachProfileId: r.id,
    userId: r.user.id,
    email: r.user.email,
    firstName: r.user.firstName,
    lastName: r.user.lastName,
    fullName: `${r.user.firstName} ${r.user.lastName}`,
    createdAt: r.user.createdAt,
    loginStatus: coachLoginStatusFromRow({ user: r.user, loginInvite: r.loginInvite }),
    classes: r.classes,
  }));
}
