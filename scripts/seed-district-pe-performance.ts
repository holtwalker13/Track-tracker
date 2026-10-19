#!/usr/bin/env tsx
/**
 * Backfill district-style PE fitness marks (Fall vs Spring) with class-linked sessions
 * so admin coach performance can attribute results to PE coaches.
 *
 * Run: npm run db:seed-pe-performance
 */
import { PrismaClient } from "@prisma/client";
import { PE_FITNESS_METRIC_SLUGS } from "../src/lib/admin/pe-fitness-metrics";

const prisma = new PrismaClient();

function displayFor(slug: string, unit: string, value: number): string {
  if (unit === "seconds") return `${(value / 60).toFixed(1)} min`;
  if (unit === "reps") return `${Math.round(value)}`;
  if (unit === "inches") return `${value.toFixed(1)}"`;
  return String(value);
}

async function ensureMileRunActivity() {
  const cat = await prisma.activityCategory.findFirst({ where: { slug: "speed" } });
  if (!cat) return;
  await prisma.activity.upsert({
    where: { slug: "mile-run" },
    create: {
      slug: "mile-run",
      name: "One Mile Run",
      unit: "seconds",
      scoringDirection: "LOWER_BETTER",
      categoryId: cat.id,
    },
    update: {},
  });
}

async function main() {
  await ensureMileRunActivity();

  const school = await prisma.school.findFirst({
    where: { slug: "demo" },
    include: { schoolYears: true },
  });
  if (!school) {
    console.log("Demo school not found — skip.");
    return;
  }

  const orgId = school.organizationId;
  const year =
    school.schoolYears.find((y) => y.isCurrent) ??
    school.schoolYears.sort((a, b) => b.startDate.getTime() - a.startDate.getTime())[0];
  if (!year) {
    console.log("No school year — skip.");
    return;
  }

  const activities = await prisma.activity.findMany({
    where: { slug: { in: [...PE_FITNESS_METRIC_SLUGS] } },
  });
  const actBySlug = new Map(activities.map((a) => [a.slug, a]));

  const classes = await prisma.class.findMany({
    where: { schoolId: school.id, period: { not: null } },
    include: {
      enrollments: { select: { studentId: true } },
      coach: { select: { id: true } },
    },
    orderBy: { period: "asc" },
  });

  const coachIndex = new Map<string, number>();
  let idx = 0;
  for (const c of classes) {
    if (c.coachId && !coachIndex.has(c.coachId)) {
      coachIndex.set(c.coachId, idx++);
    }
  }

  let created = 0;

  for (const cls of classes) {
    if (!cls.coachId || cls.enrollments.length === 0) continue;
    const coachTier = coachIndex.get(cls.coachId) ?? 0;
    const improvementBias = 0.04 + coachTier * 0.025;

    for (const [term, dateStr] of [
      ["Fall 2025", "2025-10-12"],
      ["Spring 2026", "2026-03-18"],
    ] as const) {
      const testingDate = new Date(`${dateStr}T12:00:00Z`);
      let session = await prisma.testingSession.findFirst({
        where: {
          schoolId: school.id,
          classId: cls.id,
          name: `${term} PE — ${cls.name}`,
        },
      });
      if (!session) {
        session = await prisma.testingSession.create({
          data: {
            schoolId: school.id,
            schoolYearId: year.id,
            classId: cls.id,
            name: `${term} PE — ${cls.name}`,
            testingDate,
            status: "COMPLETED",
          },
        });
      }

      for (const en of cls.enrollments) {
        const student = await prisma.studentProfile.findUnique({
          where: { id: en.studentId },
          select: {
            id: true,
            gender: true,
            enrollments: {
              where: { schoolYearId: year.id },
              take: 1,
              select: { gradeLevel: true },
            },
          },
        });
        if (!student) continue;

        for (const slug of PE_FITNESS_METRIC_SLUGS) {
          const act = actBySlug.get(slug);
          if (!act) continue;

          const existing = await prisma.performanceResult.findFirst({
            where: {
              studentId: student.id,
              activityId: act.id,
              testingSessionId: session.id,
            },
          });
          if (existing) continue;

          const base =
            slug === "sit-and-reach"
              ? 8 + (student.gender === "F" ? 2 : 0)
              : slug === "pull-ups"
                ? student.gender === "M"
                  ? 4
                  : 1
                : 480;
          const isSpring = term.startsWith("Spring");
          const mult = isSpring ? 1 + improvementBias : 1;
          const value =
            act.scoringDirection === "LOWER_BETTER"
              ? Number((base / mult).toFixed(1))
              : Number((base * mult).toFixed(1));

          await prisma.performanceResult.create({
            data: {
              studentId: student.id,
              activityId: act.id,
              schoolId: school.id,
              schoolYearId: year.id,
              organizationId: orgId,
              gradeLevel: student.enrollments[0]?.gradeLevel ?? 2028,
              resultValue: value,
              displayValue: displayFor(slug, act.unit, value),
              testingDate,
              testingSessionId: session.id,
              attemptNumber: 1,
              isBestAttempt: true,
              isPersonalRecord: isSpring,
              status: "COMPLETED",
              entryMethod: "IMPORT",
              notes: "District PE performance demo seed",
            },
          });
          created++;
        }
      }
    }
  }

  console.log(`PE performance seed: ${created} results across ${classes.length} classes.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
