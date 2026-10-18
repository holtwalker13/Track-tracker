/**
 * Idempotent: demo school student for class-link email verification (JOINLAB / joinlab2028).
 * Set CLASS_JOIN_DEMO_EMAIL to a real inbox when testing Resend on Railway.
 *
 * Usage: npx tsx scripts/ensure-demo-class-join-lab.ts
 */
import { PrismaClient } from "@prisma/client";
import { CLASS_JOIN_LAB_DEMO } from "../src/lib/tenants";
import { classJoinPath } from "../src/lib/services/class-join-link";

const prisma = new PrismaClient();

export async function ensureDemoClassJoinLab() {
  const school = await prisma.school.findFirst({ where: { slug: "demo" } });
  if (!school) {
    throw new Error("Demo school not found. Run seed first.");
  }

  const year = await prisma.schoolYear.findFirst({
    where: { schoolId: school.id, isCurrent: true },
  });
  if (!year) {
    throw new Error("Demo has no current school year.");
  }

  const demoClass = await prisma.class.findFirst({
    where: { schoolId: school.id, name: CLASS_JOIN_LAB_DEMO.className },
  });
  if (!demoClass) {
    throw new Error(`Demo class "${CLASS_JOIN_LAB_DEMO.className}" not found. Re-run seed.`);
  }

  const rosterEmail = (process.env.CLASS_JOIN_DEMO_EMAIL ?? CLASS_JOIN_LAB_DEMO.rosterEmail).trim().toLowerCase();

  let profile = await prisma.studentProfile.findFirst({
    where: { schoolId: school.id, studentNumber: CLASS_JOIN_LAB_DEMO.studentNumber },
    include: { user: true },
  });

  if (!profile) {
    profile = await prisma.studentProfile.create({
      data: {
        schoolId: school.id,
        studentNumber: CLASS_JOIN_LAB_DEMO.studentNumber,
        firstName: CLASS_JOIN_LAB_DEMO.firstName,
        lastName: CLASS_JOIN_LAB_DEMO.lastName,
        username: CLASS_JOIN_LAB_DEMO.username,
        rosterEmail,
        dateOfBirth: new Date(2010, 5, 1),
        gender: "F",
        participationType: "PE",
        anonymousId: "join-lab",
        enrollments: {
          create: { schoolYearId: year.id, gradeLevel: 2028 },
        },
      },
      include: { user: true },
    });
  } else {
    await prisma.studentProfile.update({
      where: { id: profile.id },
      data: {
        username: CLASS_JOIN_LAB_DEMO.username,
        rosterEmail,
        firstName: CLASS_JOIN_LAB_DEMO.firstName,
        lastName: CLASS_JOIN_LAB_DEMO.lastName,
      },
    });
  }

  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId: profile.id, schoolYearId: year.id },
  });
  if (!enrollment) {
    await prisma.studentEnrollment.create({
      data: { studentId: profile.id, schoolYearId: year.id, gradeLevel: 2028 },
    });
  }

  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId: demoClass.id, studentId: profile.id } },
    create: { classId: demoClass.id, studentId: profile.id },
    update: {},
  });

  const fresh = await prisma.studentProfile.findUnique({
    where: { id: profile.id },
    include: { user: true },
  });
  if (fresh?.user && !fresh.user.passwordSetAt) {
    await prisma.emailLoginCode.deleteMany({ where: { userId: fresh.user.id } });
    await prisma.user.delete({ where: { id: fresh.user.id } });
    await prisma.studentProfile.update({ where: { id: profile.id }, data: { userId: null } });
  }

  if (process.env.CLASS_JOIN_DEMO_RESET === "1" && fresh?.user?.passwordSetAt) {
    await prisma.emailLoginCode.deleteMany({ where: { userId: fresh.user.id } });
    await prisma.user.delete({ where: { id: fresh.user.id } });
    await prisma.studentProfile.update({ where: { id: profile.id }, data: { userId: null } });
  }

  const joinPath = classJoinPath(demoClass.id);
  return {
    joinPath,
    rosterEmail,
    username: CLASS_JOIN_LAB_DEMO.username,
    className: CLASS_JOIN_LAB_DEMO.className,
  };
}

async function main() {
  const info = await ensureDemoClassJoinLab();
  console.log("Demo class join lab (General Demo):");
  console.log(`  Class: ${info.className}`);
  console.log(`  Roster email: ${info.rosterEmail}`);
  console.log(`  Username: ${info.username}`);
  console.log(`  Join URL path: ${info.joinPath}`);
  console.log("  Full URL: http://localhost:3000" + info.joinPath);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
