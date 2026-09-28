import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";

export function studentEmailDomainForSchoolSlug(schoolSlug: string): string {
  if (schoolSlug === "demo") return "demo.local";
  return `${schoolSlug}.demo`;
}

async function nextStudentLoginEmail(schoolId: string, schoolSlug: string): Promise<string> {
  const domain = studentEmailDomainForSchoolSlug(schoolSlug);
  const linked = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      studentProfile: { schoolId },
    },
    select: { email: true },
  });
  let max = 0;
  for (const row of linked) {
    const match = row.email.match(/^student(\d+)@/i);
    if (match) max = Math.max(max, parseInt(match[1]!, 10));
  }
  return `student${max + 1}@${domain}`;
}

/** Create (or return existing) login user for a roster row. Password is set only via invite link. */
export async function ensureStudentLoginUser(
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    userId: string | null;
  },
  schoolId: string,
  schoolSlug: string
): Promise<string> {
  if (profile.userId) {
    const existing = await prisma.user.findUnique({
      where: { id: profile.userId },
      select: { email: true },
    });
    if (existing) return existing.email;
  }

  const email = await nextStudentLoginEmail(schoolId, schoolSlug);
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
    select: { id: true, firstName: true, lastName: true, userId: true },
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
