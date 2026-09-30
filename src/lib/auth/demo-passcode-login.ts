import { prisma } from "@/lib/db";
import { firstStudentLoginEmailForSchool } from "@/lib/services/student-login";
import { ADMIN_LOGIN, DEMO_CLASS_LOGIN, DEMO_PASSWORD, TENANTS } from "@/lib/tenants";

export function demoPasscodeMatches(input: string): boolean {
  const expected = process.env.DEMO_PASSWORD || DEMO_PASSWORD;
  return input === expected;
}

const userInclude = { coachProfile: true, studentProfile: true } as const;

export async function resolveDemoAdminUser() {
  const byEmail = await prisma.user.findUnique({
    where: { email: ADMIN_LOGIN.email },
    include: userInclude,
  });
  if (byEmail?.role === "ADMIN") return byEmail;

  return prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    include: userInclude,
  });
}

/** Pick any student account we can use for demo — no fixed email required in the DB. */
export async function resolveDemoStudentUser() {
  const byEmail = await prisma.user.findUnique({
    where: { email: DEMO_CLASS_LOGIN.email },
    include: userInclude,
  });
  if (byEmail?.role === "STUDENT" && byEmail.studentProfile) return byEmail;

  const byStudentNumber = await prisma.studentProfile.findFirst({
    where: { studentNumber: DEMO_CLASS_LOGIN.studentNumber },
    include: { user: { include: userInclude } },
  });
  if (byStudentNumber?.user?.role === "STUDENT") return byStudentNumber.user;

  for (const tenant of TENANTS) {
    const school = await prisma.school.findFirst({
      where: { slug: tenant.slug },
      select: { id: true, slug: true },
    });
    if (!school) continue;

    const email = await firstStudentLoginEmailForSchool(school.id, school.slug);
    if (!email) continue;

    const user = await prisma.user.findUnique({
      where: { email },
      include: userInclude,
    });
    if (user?.role === "STUDENT" && user.studentProfile) return user;
  }

  return prisma.user.findFirst({
    where: { role: "STUDENT", studentProfile: { isNot: null } },
    orderBy: { email: "asc" },
    include: userInclude,
  });
}
