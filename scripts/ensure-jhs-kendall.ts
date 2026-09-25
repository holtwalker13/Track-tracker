/**
 * Idempotent: ensure JHS has Kendall Leland with a student login.
 * Safe to run against an already-seeded database without wiping.
 *
 * Usage: npx tsx scripts/ensure-jhs-kendall.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_PASSWORD } from "../src/lib/tenants";

const prisma = new PrismaClient();

async function main() {
  const school = await prisma.school.findFirst({ where: { slug: "jhs" } });
  if (!school) {
    console.error("JHS school not found. Run a full seed first.");
    process.exit(1);
  }

  const year = await prisma.schoolYear.findFirst({
    where: { schoolId: school.id, isCurrent: true },
  });
  if (!year) {
    console.error("JHS has no current school year.");
    process.exit(1);
  }

  let period1 = await prisma.class.findFirst({
    where: { schoolId: school.id, period: "Period 1" },
  });
  if (!period1) {
    const coach = await prisma.coachProfile.findFirst({ where: { schoolId: school.id } });
    period1 = await prisma.class.create({
      data: {
        schoolId: school.id,
        coachId: coach?.id,
        name: "Period 1 Weights",
        period: "Period 1",
      },
    });
  }

  const existing = await prisma.studentProfile.findFirst({
    where: {
      schoolId: school.id,
      firstName: { equals: "Kendall", mode: "insensitive" },
      lastName: { equals: "Leland", mode: "insensitive" },
    },
    include: { user: true },
  });

  const password = process.env.DEMO_PASSWORD || DEMO_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 10);

  if (existing?.user) {
    console.log(`Kendall already has login: ${existing.user.email} / ${password}`);
    await prisma.classEnrollment.upsert({
      where: {
        classId_studentId: { classId: period1.id, studentId: existing.id },
      },
      create: { classId: period1.id, studentId: existing.id },
      update: {},
    });
    return;
  }

  if (existing && !existing.userId) {
    const user = await prisma.user.create({
      data: {
        email: "student1@jhs.demo",
        passwordHash,
        role: "STUDENT",
        firstName: "Kendall",
        lastName: "Leland",
      },
    });
    await prisma.studentProfile.update({
      where: { id: existing.id },
      data: { userId: user.id },
    });
    await prisma.classEnrollment.upsert({
      where: {
        classId_studentId: { classId: period1.id, studentId: existing.id },
      },
      create: { classId: period1.id, studentId: existing.id },
      update: {},
    });
    console.log(`Linked login for existing Kendall: ${user.email} / ${password}`);
    return;
  }

  // Email may already exist from a prior partial seed.
  let user = await prisma.user.findUnique({ where: { email: "student1@jhs.demo" } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "student1@jhs.demo",
        passwordHash,
        role: "STUDENT",
        firstName: "Kendall",
        lastName: "Leland",
      },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, firstName: "Kendall", lastName: "Leland", role: "STUDENT" },
    });
  }

  const profile =
    (await prisma.studentProfile.findFirst({ where: { userId: user.id } })) ??
    (await prisma.studentProfile.create({
      data: {
        userId: user.id,
        schoolId: school.id,
        studentNumber: "F0001",
        firstName: "Kendall",
        lastName: "Leland",
        dateOfBirth: new Date(2008, 8, 12),
        gender: "F",
        sports: "track",
        participationType: "ATHLETE",
        anonymousId: "3001",
        nameHidden: false,
      },
    }));

  await prisma.studentEnrollment.upsert({
    where: {
      studentId_schoolYearId: { studentId: profile.id, schoolYearId: year.id },
    },
    create: {
      studentId: profile.id,
      schoolYearId: year.id,
      gradeLevel: 2027,
    },
    update: { gradeLevel: 2027 },
  });

  await prisma.classEnrollment.upsert({
    where: {
      classId_studentId: { classId: period1.id, studentId: profile.id },
    },
    create: { classId: period1.id, studentId: profile.id },
    update: {},
  });

  console.log(`Created Kendall Leland: ${user.email} / ${password} → student dashboard`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
