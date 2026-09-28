/**
 * Test-mode setup: Ty Crowden (track coach) + Kendall Leland in a TRAINING group (not scholastic).
 * Run: npx tsx scripts/ensure-jhs-ty-crowden.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_PASSWORD } from "../src/lib/tenants";

const prisma = new PrismaClient();

async function main() {
  const school = await prisma.school.findFirst({ where: { slug: "jhs" } });
  if (!school) {
    console.error("JHS school not found. Run seed first.");
    process.exit(1);
  }

  const year = await prisma.schoolYear.findFirst({
    where: { schoolId: school.id, isCurrent: true },
  });
  if (!year) {
    console.error("No current school year for JHS.");
    process.exit(1);
  }

  const password = process.env.DEMO_PASSWORD || DEMO_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 10);
  const email = "ty.crowden@jhs.demo";

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "COACH",
        firstName: "Ty",
        lastName: "Crowden",
        passwordSetAt: new Date(),
      },
    });
  }

  let coach = await prisma.coachProfile.findFirst({
    where: { userId: user.id, schoolId: school.id },
  });
  if (!coach) {
    coach = await prisma.coachProfile.create({
      data: { userId: user.id, schoolId: school.id },
    });
  }

  let trackClass = await prisma.class.findFirst({
    where: { schoolId: school.id, name: "Track Training", coachId: coach.id },
  });
  if (!trackClass) {
    trackClass = await prisma.class.create({
      data: {
        schoolId: school.id,
        coachId: coach.id,
        name: "Track Training",
        programKind: "TRAINING",
        period: null,
      },
    });
  } else if (trackClass.programKind !== "TRAINING") {
    trackClass = await prisma.class.update({
      where: { id: trackClass.id },
      data: { programKind: "TRAINING", coachId: coach.id },
    });
  }

  let kendall = await prisma.studentProfile.findFirst({
    where: {
      schoolId: school.id,
      firstName: { equals: "Kendall", mode: "insensitive" },
      lastName: { equals: "Leland", mode: "insensitive" },
    },
  });

  if (!kendall) {
    kendall = await prisma.studentProfile.create({
      data: {
        schoolId: school.id,
        studentNumber: "F0001",
        firstName: "Kendall",
        lastName: "Leland",
        dateOfBirth: new Date(2010, 0, 1),
        gender: "F",
        participationType: "ATHLETE",
        sports: "Track",
        anonymousId: "kendall-leland",
        enrollments: {
          create: { schoolYearId: year.id, gradeLevel: 2028 },
        },
      },
    });
  }

  await prisma.classEnrollment.upsert({
    where: {
      classId_studentId: { classId: trackClass.id, studentId: kendall.id },
    },
    create: { classId: trackClass.id, studentId: kendall.id },
    update: {},
  });

  console.log(`Coach: ${email} / ${password}`);
  console.log(`Class: ${trackClass.name} (${trackClass.id}) — Kendall Leland enrolled for track testing only.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
