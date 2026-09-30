/**
 * Idempotent: demo school quick login demo / rekcart (student DEMO).
 * Usage: npx tsx scripts/ensure-demo-class-login.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_CLASS_LOGIN } from "../src/lib/tenants";

const prisma = new PrismaClient();

async function main() {
  const school = await prisma.school.findFirst({ where: { slug: "demo" } });
  if (!school) {
    console.error("Demo school not found. Run seed first.");
    process.exit(1);
  }

  const year = await prisma.schoolYear.findFirst({
    where: { schoolId: school.id, isCurrent: true },
  });
  if (!year) {
    console.error("Demo has no current school year.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(DEMO_CLASS_LOGIN.password, 12);
  const email = DEMO_CLASS_LOGIN.email;

  let profile = await prisma.studentProfile.findFirst({
    where: { schoolId: school.id, studentNumber: DEMO_CLASS_LOGIN.studentNumber },
    include: { user: true },
  });

  if (!profile) {
    profile = await prisma.studentProfile.create({
      data: {
        schoolId: school.id,
        studentNumber: DEMO_CLASS_LOGIN.studentNumber,
        firstName: "Demo",
        lastName: "Student",
        dateOfBirth: new Date(2010, 0, 1),
        gender: "F",
        participationType: "PE",
        anonymousId: "demo-class",
        enrollments: {
          create: { schoolYearId: year.id, gradeLevel: 2028 },
        },
      },
      include: { user: true },
    });
  }

  if (profile.user) {
    await prisma.user.update({
      where: { id: profile.user.id },
      data: { passwordHash, passwordSetAt: new Date() },
    });
  } else {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "STUDENT",
        firstName: profile.firstName,
        lastName: profile.lastName,
        passwordSetAt: new Date(),
      },
    });
    await prisma.studentProfile.update({
      where: { id: profile.id },
      data: { userId: user.id },
    });
  }

  console.log(
    `Demo class login: username "${DEMO_CLASS_LOGIN.username}" or ${email} / ${DEMO_CLASS_LOGIN.password}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
