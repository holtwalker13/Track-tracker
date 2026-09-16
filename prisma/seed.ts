import { PrismaClient } from "@prisma/client";
type ScoringDirection = "HIGHER_BETTER" | "LOWER_BETTER";
import bcrypt from "bcryptjs";
import { genderFromFirstName } from "../src/lib/gender";

const prisma = new PrismaClient();

const ACTIVITIES: {
  slug: string;
  name: string;
  cat: string;
  unit: string;
  dir: ScoringDirection;
  min?: number;
  max?: number;
  bw?: boolean;
}[] = [
  { slug: "40-yard-dash", name: "40-Yard Dash", cat: "speed", unit: "seconds", dir: "LOWER_BETTER", min: 4.5, max: 12 },
  { slug: "50-yard-dash", name: "50-Yard Dash", cat: "speed", unit: "seconds", dir: "LOWER_BETTER", min: 6, max: 14 },
  { slug: "100-meter-dash", name: "100-Meter Dash", cat: "speed", unit: "seconds", dir: "LOWER_BETTER", min: 11, max: 22 },
  { slug: "shuttle-run", name: "Shuttle Run", cat: "agility", unit: "seconds", dir: "LOWER_BETTER", min: 7, max: 20 },
  { slug: "pro-agility", name: "Pro Agility (5-10-5)", cat: "agility", unit: "seconds", dir: "LOWER_BETTER", min: 4, max: 12 },
  { slug: "standing-broad-jump", name: "Standing Broad Jump", cat: "power", unit: "inches", dir: "HIGHER_BETTER", min: 48, max: 130 },
  { slug: "vertical-jump", name: "Vertical Jump", cat: "power", unit: "inches", dir: "HIGHER_BETTER", min: 6, max: 40 },
  { slug: "bench-press", name: "Bench Press", cat: "strength", unit: "lb", dir: "HIGHER_BETTER", min: 45, max: 350, bw: true },
  { slug: "push-ups", name: "Push-Ups", cat: "strength", unit: "reps", dir: "HIGHER_BETTER", min: 0, max: 100 },
  { slug: "pull-ups", name: "Bodyweight Pull-Ups", cat: "strength", unit: "reps", dir: "HIGHER_BETTER", min: 0, max: 40 },
  { slug: "squat", name: "Squat", cat: "strength", unit: "lb", dir: "HIGHER_BETTER", min: 45, max: 500, bw: true },
  { slug: "sit-ups", name: "Sit-Ups (1 min)", cat: "core", unit: "reps", dir: "HIGHER_BETTER", min: 0, max: 80 },
  { slug: "plank", name: "Plank", cat: "core", unit: "seconds", dir: "HIGHER_BETTER", min: 10, max: 600 },
  { slug: "sit-and-reach", name: "Sit and Reach", cat: "flexibility", unit: "inches", dir: "HIGHER_BETTER", min: -5, max: 25 },
  { slug: "mile-run", name: "Mile Run", cat: "endurance", unit: "seconds", dir: "LOWER_BETTER", min: 300, max: 900 },
  { slug: "height", name: "Height", cat: "body", unit: "in", dir: "HIGHER_BETTER", min: 48, max: 84 },
  { slug: "weight", name: "Weight", cat: "body", unit: "lb", dir: "HIGHER_BETTER", min: 60, max: 350 },
];

const CATEGORIES = [
  { slug: "speed", name: "Speed" },
  { slug: "agility", name: "Agility" },
  { slug: "power", name: "Explosive Power" },
  { slug: "strength", name: "Strength" },
  { slug: "core", name: "Core" },
  { slug: "flexibility", name: "Flexibility" },
  { slug: "endurance", name: "Endurance" },
  { slug: "body", name: "Body Metrics" },
];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  await prisma.performanceResult.deleteMany();
  await prisma.studentAchievement.deleteMany();
  await prisma.testingSessionStudent.deleteMany();
  await prisma.testingSessionActivity.deleteMany();
  await prisma.testingSession.deleteMany();
  await prisma.classEnrollment.deleteMany();
  await prisma.class.deleteMany();
  await prisma.studentEnrollment.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.coachProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.benchmarkValue.deleteMany();
  await prisma.benchmarkDataset.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.activityCategory.deleteMany();
  await prisma.schoolYear.deleteMany();
  await prisma.school.deleteMany();
  await prisma.district.deleteMany();
  await prisma.organizationSettings.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.achievement.deleteMany();

  const hash = await bcrypt.hash("password123", 10);

  const org = await prisma.organization.create({
    data: {
      name: "Demo Athletic District",
      slug: "demo-district",
      benchmarkSharingEnabled: true,
      settings: { create: {} },
    },
  });

  const district = await prisma.district.create({
    data: { organizationId: org.id, name: "Riverside Unified", region: "Demo Region" },
  });

  const school = await prisma.school.create({
    data: {
      organizationId: org.id,
      districtId: district.id,
      name: "Riverside Middle & High",
    },
  });

  const years = [
    { label: "2024–2025", start: new Date("2024-08-15"), end: new Date("2025-06-15"), current: false },
    { label: "2025–2026", start: new Date("2025-08-15"), end: new Date("2026-06-15"), current: false },
    { label: "2026–2027", start: new Date("2026-08-15"), end: new Date("2027-06-15"), current: true },
  ];

  const schoolYears = await Promise.all(
    years.map((y) =>
      prisma.schoolYear.create({
        data: {
          schoolId: school.id,
          label: y.label,
          startDate: y.start,
          endDate: y.end,
          isCurrent: y.current,
        },
      })
    )
  );

  for (const c of CATEGORIES) {
    await prisma.activityCategory.create({
      data: { slug: c.slug, name: c.name, sortOrder: CATEGORIES.indexOf(c) },
    });
  }
  const cats = await prisma.activityCategory.findMany();
  const catMap = new Map(cats.map((c) => [c.slug, c.id]));

  const activityRecords = await Promise.all(
    ACTIVITIES.map((a) =>
      prisma.activity.create({
        data: {
          slug: a.slug,
          name: a.name,
          categoryId: catMap.get(a.cat)!,
          unit: a.unit,
          scoringDirection: a.dir,
          minRealistic: a.min,
          maxRealistic: a.max,
          bodyweightInfluenced: a.bw ?? false,
        },
      })
    )
  );

  const dataset = await prisma.benchmarkDataset.create({
    data: {
      name: "SYNTHETIC_DEV National Norms",
      sourceName: "Platform Development — NOT validated data",
      datasetYear: 2026,
      population: "NATIONAL",
      populationSize: 10000,
      geographicRegion: "Synthetic",
      methodologyNotes: "Generated for UI development only. Do not use for real comparisons.",
      isSynthetic: true,
    },
  });

  for (const act of activityRecords) {
    if (act.slug === "height" || act.slug === "weight") continue;
    for (let grade = 6; grade <= 12; grade++) {
      const base =
        act.scoringDirection === "HIGHER_BETTER"
          ? 10 + grade * 2 + Math.random() * 5
          : 20 - grade * 0.3 + Math.random() * 2;
      const p50 = base;
      const spread = act.scoringDirection === "HIGHER_BETTER" ? 4 : 1.5;
      await prisma.benchmarkValue.create({
        data: {
          datasetId: dataset.id,
          activityId: act.id,
          gradeLevel: grade,
          age: grade + 5.5,
          p25: act.scoringDirection === "HIGHER_BETTER" ? p50 - spread : p50 + spread,
          p50,
          p75: act.scoringDirection === "HIGHER_BETTER" ? p50 + spread : p50 - spread,
          p90: act.scoringDirection === "HIGHER_BETTER" ? p50 + spread * 2 : p50 - spread * 2,
        },
      });
    }
  }

  const achievements = [
    { slug: "first-test", name: "First Test Completed", description: "Recorded your first athletic test." },
    { slug: "five-tests", name: "5 Tests Completed", description: "Completed five tests." },
    { slug: "new-pr", name: "New Personal Record", description: "Set a new personal best." },
    { slug: "top-25", name: "Top 25%", description: "Ranked in the top 25% for an activity." },
    { slug: "grade-leader", name: "Grade Leader", description: "Led your grade in an activity." },
  ];
  for (const a of achievements) {
    await prisma.achievement.create({ data: a });
  }

  const coaches = await Promise.all(
    ["Morgan", "Taylor", "Jordan", "Casey"].map(async (first, i) => {
      const user = await prisma.user.create({
        data: {
          email: `coach${i + 1}@riverside.demo`,
          passwordHash: hash,
          role: "COACH",
          firstName: first,
          lastName: "Coach",
        },
      });
      return prisma.coachProfile.create({
        data: { userId: user.id, schoolId: school.id },
      });
    })
  );

  const firstNames = ["Alex", "Jordan", "Emma", "Connor", "Mia", "Noah", "Sophia", "Liam", "Olivia", "Ethan", "Ava", "Lucas"];
  const lastNames = ["Johnson", "Williams", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson", "Thomas"];

  const students: { id: string; grade: number }[] = [];
  let studentIndex = 0;

  for (let grade = 6; grade <= 12; grade++) {
    const classRec = await prisma.class.create({
      data: {
        schoolId: school.id,
        coachId: coaches[grade % coaches.length].id,
        name: `Grade ${grade} PE`,
        period: `Period ${(grade % 4) + 1}`,
        gradeLevel: grade,
      },
    });

    const perGrade = grade <= 8 ? 45 : 40;
    for (let i = 0; i < perGrade; i++) {
      studentIndex++;
      const fn = pick(firstNames);
      const ln = pick(lastNames);
      const dob = new Date(2010 + (12 - grade), Math.floor(Math.random() * 12), 15);

      const user = await prisma.user.create({
        data: {
          email: `student${studentIndex}@riverside.demo`,
          passwordHash: hash,
          role: "STUDENT",
          firstName: fn,
          lastName: ln,
        },
      });

      const profile = await prisma.studentProfile.create({
        data: {
          userId: user.id,
          schoolId: school.id,
          studentNumber: `STU${String(studentIndex).padStart(4, "0")}`,
          firstName: fn,
          lastName: ln,
          dateOfBirth: dob,
          gender: genderFromFirstName(fn, studentIndex),
          anonymousId: String(1000 + studentIndex),
        },
      });

      await prisma.classEnrollment.create({
        data: { classId: classRec.id, studentId: profile.id },
      });

      for (const sy of schoolYears) {
        const yearOffset = schoolYears.indexOf(sy);
        const g = Math.min(12, Math.max(6, grade - (2 - yearOffset)));
        if (g < 6) continue;
        await prisma.studentEnrollment.create({
          data: { studentId: profile.id, schoolYearId: sy.id, gradeLevel: g },
        });
      }

      students.push({ id: profile.id, grade });
    }
  }

  const testActivities = activityRecords.filter((a) =>
    ["vertical-jump", "standing-broad-jump", "pull-ups", "100-meter-dash", "sit-and-reach", "shuttle-run"].includes(
      a.slug
    )
  );

  const currentYear = schoolYears[2];
  const session = await prisma.testingSession.create({
    data: {
      schoolId: school.id,
      schoolYearId: currentYear.id,
      name: "Spring 2027 Athletic Testing",
      testingDate: new Date("2027-04-12"),
      gradeLevel: 7,
      status: "ACTIVE",
      classId: undefined,
    },
  });

  for (const act of testActivities) {
    await prisma.testingSessionActivity.create({
      data: { sessionId: session.id, activityId: act.id, sortOrder: testActivities.indexOf(act) },
    });
  }

  const grade7Students = students.slice(45, 90);
  for (const s of grade7Students) {
    await prisma.testingSessionStudent.create({
      data: { sessionId: session.id, studentId: s.id },
    });
  }

  const coachUser = await prisma.user.findFirst({ where: { role: "COACH" } });

  for (const sy of schoolYears) {
    const syIdx = schoolYears.indexOf(sy);
    for (const student of students) {
      const enrollment = await prisma.studentEnrollment.findFirst({
        where: { studentId: student.id, schoolYearId: sy.id },
      });
      if (!enrollment) continue;

      const profile = await prisma.studentProfile.findUniqueOrThrow({
        where: { id: student.id },
      });

      const improvementFactor = 1 + syIdx * 0.08 + (Math.random() - 0.5) * 0.1;
      const missSome = Math.random() < 0.08;

      for (const act of testActivities) {
        if (missSome && Math.random() < 0.15) continue;

        let base: number;
        if (act.slug === "vertical-jump") base = 14 + enrollment.gradeLevel * 1.2;
        else if (act.slug === "standing-broad-jump") base = 60 + enrollment.gradeLevel * 4;
        else if (act.slug === "pull-ups") base = enrollment.gradeLevel - 3;
        else if (act.slug === "100-meter-dash") base = 18 - enrollment.gradeLevel * 0.4;
        else if (act.slug === "sit-and-reach") base = 8 + enrollment.gradeLevel * 0.5;
        else base = 12 - enrollment.gradeLevel * 0.2;

        const value = base * improvementFactor + rand(-2, 2);
        const weight = 90 + enrollment.gradeLevel * 8 + rand(-10, 10);

        await prisma.performanceResult.create({
          data: {
            studentId: student.id,
            activityId: act.id,
            schoolId: school.id,
            schoolYearId: sy.id,
            organizationId: org.id,
            gradeLevel: enrollment.gradeLevel,
            resultValue: value,
            displayValue: String(Math.round(value * 10) / 10),
            attemptNumber: 1,
            isBestAttempt: true,
            isPersonalRecord: syIdx > 0 && Math.random() < 0.25,
            testingDate: new Date(sy.startDate.getTime() + 200 * 24 * 60 * 60 * 1000),
            ageAtTest: enrollment.gradeLevel + 5.5,
            weightAtTest: weight,
            enteredById: coachUser?.id,
            entryMethod: "LIVE_GRID",
            status: "COMPLETED",
            testingSessionId: sy.id === currentYear.id ? session.id : undefined,
          },
        });
      }
    }
  }

  const demoStudent = await prisma.studentProfile.findFirst({
    where: { firstName: "Alex" },
  });

  console.log("Seed complete.");
  console.log("School:", school.name);
  console.log("Students:", students.length);
  console.log("Coach login: coach1@riverside.demo / password123");
  if (demoStudent) {
    const du = await prisma.user.findFirst({ where: { studentProfile: { id: demoStudent.id } } });
    console.log("Sample student:", du?.email, "/ password123");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
