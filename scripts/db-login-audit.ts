/**
 * Inspect student login rows (passwordSetAt, username). Run where DATABASE_URL reaches Postgres:
 *   railway run npm run db:login-audit
 * Or from app container / Railway shell with DATABASE_URL set.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_PASSWORD } from "../src/lib/tenants";
import { buildStudentUsernameBase } from "../src/lib/services/student-username";
import { DEFAULT_CLASS_YEAR } from "../src/lib/grades";

const prisma = new PrismaClient();

async function main() {
  const demoPass = process.env.DEMO_PASSWORD || DEMO_PASSWORD;

  const students = await prisma.studentProfile.findMany({
    where: {
      OR: [
        { lastName: { contains: "full", mode: "insensitive" } },
        { firstName: { contains: "tyson", mode: "insensitive" } },
      ],
    },
    include: {
      school: { select: { name: true, slug: true } },
      user: { select: { email: true, passwordSetAt: true, passwordHash: true } },
      enrollments: {
        where: { schoolYear: { isCurrent: true } },
        select: { gradeLevel: true },
        take: 1,
      },
    },
  });

  console.log("=== Name / login audit (Full / Tyson) ===");
  if (students.length === 0) {
    console.log("No matching student profiles.");
  }
  for (const s of students) {
    const year = s.enrollments[0]?.gradeLevel ?? DEFAULT_CLASS_YEAR;
    const suggested = buildStudentUsernameBase(s.firstName, s.lastName, year);
    let looksLikeDemo = false;
    if (s.user?.passwordHash) {
      looksLikeDemo = await bcrypt.compare(demoPass, s.user.passwordHash);
    }
    console.log({
      name: `${s.firstName} ${s.lastName}`,
      school: s.school.name,
      studentNumber: s.studentNumber,
      username: s.username,
      suggestedUsername: suggested,
      hasUser: Boolean(s.user),
      email: s.user?.email ?? null,
      passwordSetAt: s.user?.passwordSetAt?.toISOString() ?? null,
      hashMatchesSharedDemoPassword: looksLikeDemo,
    });
  }

  const active = await prisma.user.count({
    where: { role: "STUDENT", passwordSetAt: { not: null } },
  });
  const provisional = await prisma.user.count({
    where: { role: "STUDENT", passwordSetAt: null },
  });
  const missingUsername = await prisma.studentProfile.count({
    where: { username: null, userId: { not: null } },
  });

  console.log("\n=== Summary ===");
  console.log({ studentsWithPasswordSet: active, studentsProvisionalNoPassword: provisional, linkedProfilesMissingUsername: missingUsername });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
