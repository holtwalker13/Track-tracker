import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { DEMO_PASSWORD } from "@/lib/tenants";

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

/** Create (or return existing) login user for a roster student. Password matches demo schools. */
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
  const password = process.env.DEMO_PASSWORD || DEMO_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "STUDENT",
      firstName: profile.firstName,
      lastName: profile.lastName,
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

export async function firstStudentLoginEmailForSchool(
  schoolId: string,
  schoolSlug: string
): Promise<string | null> {
  await backfillStudentLoginsForSchool(schoolId, schoolSlug);
  const user = await prisma.user.findFirst({
    where: { role: "STUDENT", studentProfile: { schoolId } },
    orderBy: { email: "asc" },
    select: { email: true },
  });
  return user?.email ?? null;
}
