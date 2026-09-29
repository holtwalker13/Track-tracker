import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { studentLoginEmailForNumber } from "@/lib/services/student-login-invite";

export function studentEmailDomainForSchoolSlug(schoolSlug: string): string {
  if (schoolSlug === "demo") return "demo.local";
  return `${schoolSlug}.demo`;
}

/** Create (or return existing) login user for a roster row. Password is set only via invite link. */
export async function ensureStudentLoginUser(
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    userId: string | null;
    studentNumber: string;
  },
  schoolId: string,
  schoolSlug: string
): Promise<string> {
  const canonicalEmail = studentLoginEmailForNumber(profile.studentNumber, schoolSlug);

  if (profile.userId) {
    const existing = await prisma.user.findUnique({
      where: { id: profile.userId },
      select: { email: true },
    });
    if (existing) {
      if (existing.email !== canonicalEmail) {
        const taken = await prisma.user.findUnique({
          where: { email: canonicalEmail },
          select: { id: true },
        });
        if (!taken || taken.id === profile.userId) {
          await prisma.user.update({
            where: { id: profile.userId },
            data: { email: canonicalEmail },
          });
        }
      }
      return canonicalEmail;
    }
  }

  const taken = await prisma.user.findUnique({
    where: { email: canonicalEmail },
    select: { studentProfile: { select: { id: true } } },
  });
  if (taken && taken.studentProfile?.id !== profile.id) {
    throw new Error(`Login email ${canonicalEmail} is already in use`);
  }

  const email = canonicalEmail;
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "STUDENT",
      firstName: profile.firstName,
      lastName: profile.lastName,
      passwordSetAt: null,
    },
  });

  await prisma.studentProfile.update({
    where: { id: profile.id },
    data: { userId: user.id },
  });

  return user.email;
}

/** Backfill login users for roster rows that only have a profile (manual add / CSV import). */
export async function backfillStudentLoginsForSchool(schoolId: string, schoolSlug: string) {
  const missing = await prisma.studentProfile.findMany({
    where: { schoolId, userId: null },
    select: { id: true, firstName: true, lastName: true, userId: true, studentNumber: true },
    orderBy: { createdAt: "asc" },
  });
  for (const profile of missing) {
    await ensureStudentLoginUser(profile, schoolId, schoolSlug);
  }
}

/** Demo/backfill studentN@ accounts created before passwordSetAt existed. */
export async function backfillLegacyDemoStudentPasswordSetAt() {
  const users = await prisma.user.findMany({
    where: { role: "STUDENT", passwordSetAt: null },
    select: { id: true, email: true },
  });
  for (const user of users) {
    if (/^student\d+@/i.test(user.email)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordSetAt: new Date() },
      });
    }
  }
}

export async function firstStudentLoginEmailForSchool(
  schoolId: string,
  schoolSlug: string
): Promise<string | null> {
  await backfillLegacyDemoStudentPasswordSetAt();
  await backfillStudentLoginsForSchool(schoolId, schoolSlug);
  const user = await prisma.user.findFirst({
    where: { role: "STUDENT", studentProfile: { schoolId } },
    orderBy: { email: "asc" },
    select: { email: true },
  });
  return user?.email ?? null;
}
