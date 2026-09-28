import { prisma } from "@/lib/db";
import { createOrRefreshCoachLoginInvite, placeholderPasswordHash } from "@/lib/services/coach-login-invite";
import { coachLoginStatusFromRow } from "@/lib/services/coach-login-invite";

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
