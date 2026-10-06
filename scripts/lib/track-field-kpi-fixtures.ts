/**
 * Track and Field class + 6 ranked KPIs (Kendall / coach demo scenario).
 * Idempotent — safe on demo and Jackson (JHS) schools.
 */
import type { PrismaClient } from "@prisma/client";

export const TRACK_FIELD_CLASS_RANKED = [
  "box-squat",
  "standing-broad-jump",
  "flying-10-meter",
  "flying-20-meter",
  "flying-30-meter",
  "vertical-jump",
] as const;

const BRONZE_TARGETS_F: Record<(typeof TRACK_FIELD_CLASS_RANKED)[number], number> = {
  "box-squat": 185,
  "standing-broad-jump": 81,
  "vertical-jump": 19.5,
  "flying-10-meter": 1.226,
  "flying-20-meter": 2.45,
  "flying-30-meter": 3.6,
};

export type TrackFieldFixtureInput = {
  schoolId: string;
  coachProfileId: string;
  studentId: string;
  classPeriod?: string;
  subgroupName?: string;
};

async function ensureSchoolActivities(prisma: PrismaClient, schoolId: string) {
  const speedCat = await prisma.activityCategory.findFirstOrThrow({ where: { slug: "speed" } });
  const strengthCat = await prisma.activityCategory.findFirstOrThrow({ where: { slug: "strength" } });
  await prisma.activity.upsert({
    where: { slug: "box-squat" },
    create: {
      slug: "box-squat",
      name: "Box Squat",
      unit: "lb",
      scoringDirection: "HIGHER_BETTER",
      categoryId: strengthCat.id,
      schoolId,
    },
    update: {},
  });
  await prisma.activity.upsert({
    where: { slug: "flying-30-meter" },
    create: {
      slug: "flying-30-meter",
      name: "Flying 30 m",
      unit: "seconds",
      scoringDirection: "LOWER_BETTER",
      categoryId: speedCat.id,
      schoolId,
    },
    update: {},
  });
}

/** Apply Track and Field class, subgroup, enrollment, and class KPI set. */
export async function applyTrackFieldKpiFixtures(
  prisma: PrismaClient,
  input: TrackFieldFixtureInput
): Promise<{ classId: string; kpiSetId: string | null }> {
  const {
    schoolId,
    coachProfileId,
    studentId,
    classPeriod = "Period 9",
    subgroupName = "Coach Crowden's Training Group",
  } = input;

  await ensureSchoolActivities(prisma, schoolId);

  const cls =
    (await prisma.class.findFirst({ where: { schoolId, name: "Track and Field" } })) ??
    (await prisma.class.create({
      data: {
        schoolId,
        coachId: coachProfileId,
        name: "Track and Field",
        period: classPeriod,
      },
    }));

  await prisma.classCoach.upsert({
    where: { classId_coachId: { classId: cls.id, coachId: coachProfileId } },
    create: { classId: cls.id, coachId: coachProfileId },
    update: {},
  });

  const sg =
    (await prisma.classSubgroup.findFirst({ where: { classId: cls.id, name: subgroupName } })) ??
    (await prisma.classSubgroup.create({
      data: { classId: cls.id, name: subgroupName },
    }));

  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId: cls.id, studentId } },
    create: { classId: cls.id, studentId },
    update: {},
  });
  await prisma.classSubgroupMember.upsert({
    where: { subgroupId_studentId: { subgroupId: sg.id, studentId } },
    create: { subgroupId: sg.id, studentId },
    update: {},
  });

  let kpiSetId: string | null = null;
  const existing = await prisma.kpiSet.findFirst({
    where: { schoolId, classId: cls.id, subgroupId: null },
  });

  if (!existing) {
    const created = await prisma.kpiSet.create({
      data: {
        schoolId,
        coachProfileId,
        classId: cls.id,
        name: cls.name,
        sport: "pe",
        metrics: {
          create: TRACK_FIELD_CLASS_RANKED.map((metricSlug, i) => ({
            metricSlug,
            ranked: true,
            sortOrder: i,
          })),
        },
        targets: {
          create: TRACK_FIELD_CLASS_RANKED.map((slug) => ({
            gender: "F",
            medal: "bronze",
            metricSlug: slug,
            target: BRONZE_TARGETS_F[slug],
            ageBracket: "high-9-12",
          })),
        },
      },
    });
    kpiSetId = created.id;
  } else {
    kpiSetId = existing.id;
  }

  return { classId: cls.id, kpiSetId };
}

export async function applyTrackFieldFixturesForSchoolSlug(
  prisma: PrismaClient,
  schoolSlug: string,
  opts: {
    coachEmail: string;
    studentUserEmail?: string;
    studentName?: { firstName: string; lastName: string };
  }
): Promise<void> {
  const school = await prisma.school.findFirst({ where: { slug: schoolSlug } });
  if (!school) {
    console.warn(`[track-field] Skipping — school slug "${schoolSlug}" not found`);
    return;
  }

  const coach = await prisma.coachProfile.findFirst({
    where: { schoolId: school.id, user: { email: opts.coachEmail } },
  });
  if (!coach) {
    console.warn(`[track-field] Skipping ${schoolSlug} — coach ${opts.coachEmail} not found`);
    return;
  }

  let student = null;
  if (opts.studentUserEmail) {
    student = await prisma.studentProfile.findFirst({
      where: { schoolId: school.id, user: { email: opts.studentUserEmail } },
    });
  }
  if (!student && opts.studentName) {
    student = await prisma.studentProfile.findFirst({
      where: {
        schoolId: school.id,
        firstName: opts.studentName.firstName,
        lastName: opts.studentName.lastName,
      },
    });
  }
  if (!student) {
    console.warn(`[track-field] Skipping ${schoolSlug} — student not found`);
    return;
  }

  const result = await applyTrackFieldKpiFixtures(prisma, {
    schoolId: school.id,
    coachProfileId: coach.id,
    studentId: student.id,
  });
  console.log(
    `[track-field] ${schoolSlug}: Track and Field + 6 ranked KPIs (student ${student.firstName} ${student.lastName}, class ${result.classId})`
  );
}
