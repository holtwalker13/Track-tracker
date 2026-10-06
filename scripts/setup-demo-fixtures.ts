/**
 * Demo fixtures: "Track and Field" class + "Coach Crowden's Training Group"
 * subgroup (Kendall enrolled + member), with the class KPI set configured to
 * the 6 ranked KPIs from the reported scenario.
 */
import { prisma } from "../src/lib/db";

const CLASS_RANKED = [
  "box-squat",
  "standing-broad-jump",
  "flying-10-meter",
  "flying-20-meter",
  "flying-30-meter",
  "vertical-jump",
];

async function main() {
  const school = await prisma.school.findFirstOrThrow({ where: { slug: "jhs" } });
  const coach = await prisma.coachProfile.findFirstOrThrow({
    where: { schoolId: school.id, user: { email: "coach1@jhs.demo" } },
  });
  const kendall = await prisma.studentProfile.findFirstOrThrow({
    where: { schoolId: school.id, firstName: "Kendall", lastName: "Leland" },
  });

  const cls =
    (await prisma.class.findFirst({ where: { schoolId: school.id, name: "Track and Field" } })) ??
    (await prisma.class.create({
      data: { schoolId: school.id, coachId: coach.id, name: "Track and Field", period: "Period 9" },
    }));
  await prisma.classCoach.upsert({
    where: { classId_coachId: { classId: cls.id, coachId: coach.id } },
    create: { classId: cls.id, coachId: coach.id },
    update: {},
  });

  const sg =
    (await prisma.classSubgroup.findFirst({ where: { classId: cls.id, name: "Coach Crowden's Training Group" } })) ??
    (await prisma.classSubgroup.create({
      data: { classId: cls.id, name: "Coach Crowden's Training Group" },
    }));

  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId: cls.id, studentId: kendall.id } },
    create: { classId: cls.id, studentId: kendall.id },
    update: {},
  });
  await prisma.classSubgroupMember.upsert({
    where: { subgroupId_studentId: { subgroupId: sg.id, studentId: kendall.id } },
    create: { subgroupId: sg.id, studentId: kendall.id },
    update: {},
  });

  // Custom school activities used by the class KPI list
  const speedCat = await prisma.activityCategory.findFirstOrThrow({ where: { slug: "speed" } });
  const strengthCat = await prisma.activityCategory.findFirstOrThrow({ where: { slug: "strength" } });
  await prisma.activity.upsert({
    where: { slug: "box-squat" },
    create: { slug: "box-squat", name: "Box Squat", unit: "lb", scoringDirection: "HIGHER_BETTER", categoryId: strengthCat.id, schoolId: school.id },
    update: {},
  });
  await prisma.activity.upsert({
    where: { slug: "flying-30-meter" },
    create: { slug: "flying-30-meter", name: "Flying 30 m", unit: "seconds", scoringDirection: "LOWER_BETTER", categoryId: speedCat.id, schoolId: school.id },
    update: {},
  });

  // Class KPI set with the 6 ranked KPIs + bronze targets
  const existing = await prisma.kpiSet.findFirst({
    where: { schoolId: school.id, classId: cls.id, subgroupId: null },
  });
  if (!existing) {
    await prisma.kpiSet.create({
      data: {
        schoolId: school.id,
        coachProfileId: coach.id,
        classId: cls.id,
        name: cls.name,
        sport: "pe",
        metrics: { create: CLASS_RANKED.map((metricSlug, i) => ({ metricSlug, ranked: true, sortOrder: i })) },
        targets: {
          create: CLASS_RANKED.map((slug) => ({
            gender: "F",
            medal: "bronze",
            metricSlug: slug,
            target:
              slug === "box-squat" ? 185 :
              slug === "standing-broad-jump" ? 81 :
              slug === "vertical-jump" ? 19.5 :
              slug === "flying-10-meter" ? 1.226 :
              slug === "flying-20-meter" ? 2.45 : 3.6,
            ageBracket: "high-9-12",
          })),
        },
      },
    });
  }

  console.log("Fixtures ready: Track and Field + Coach Crowden's Training Group (Kendall), class KPI set with 6 ranked KPIs");
}
main().finally(() => prisma.$disconnect());
