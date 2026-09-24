import { prisma } from "@/lib/db";
import { DEFAULT_CLASS_YEAR } from "@/lib/grades";
import { ageAtDate, formatActivityValue } from "@/lib/format";
import type { ScoringDirection } from "@/lib/constants";
import { epleyE1rm } from "@/lib/services/workout-progression";
import {
  calculatePersonalRecord,
} from "@/lib/services/performance";
import { getPreviousBest } from "@/lib/services/results";

const WORKOUT_SESSION_NOTES_PREFIX = "workoutSession:";

const RELATIVE_SLUG_BY_ABSOLUTE: Record<string, string> = {
  squat: "squat-relative",
  "hang-clean": "hang-clean-relative",
};

function workoutSessionNotes(sessionId: string) {
  return `${WORKOUT_SESSION_NOTES_PREFIX}${sessionId}`;
}

/** Best set performance for leaderboard/progress (e1RM for lb lifts, max reps for rep events). */
export function deriveWorkoutPerformanceValue(
  activity: { slug: string; unit: string },
  logs: { weightLb: number | null; reps: number | null; skipped: boolean }[]
): number | null {
  const usable = logs.filter(
    (l) => !l.skipped && l.reps != null && l.reps > 0
  );
  if (usable.length === 0) return null;

  if (activity.unit === "reps") {
    return Math.max(...usable.map((l) => l.reps!));
  }

  let bestE1rm = 0;
  for (const l of usable) {
    const weight = l.weightLb ?? 0;
    if (weight <= 0) continue;
    bestE1rm = Math.max(bestE1rm, epleyE1rm(weight, l.reps!));
  }
  if (bestE1rm <= 0) return null;
  return Math.round(bestE1rm * 10) / 10;
}

async function resolveSchoolYear(schoolId: string, testingDate: Date) {
  const years = await prisma.schoolYear.findMany({
    where: { schoolId },
    orderBy: { startDate: "asc" },
  });
  const current = years.find((y) => y.isCurrent) ?? years[years.length - 1];
  return (
    years.find((y) => testingDate >= y.startDate && testingDate <= y.endDate) ??
    current ??
    null
  );
}

async function getLatestBodyWeightLb(
  studentId: string,
  onOrBefore: Date
): Promise<number | null> {
  const weightActivity = await prisma.activity.findFirst({
    where: { slug: "weight", schoolId: null },
  });
  if (!weightActivity) return null;
  const latest = await prisma.performanceResult.findFirst({
    where: {
      studentId,
      activityId: weightActivity.id,
      status: "COMPLETED",
      resultValue: { not: null },
      testingDate: { lte: onOrBefore },
    },
    orderBy: { testingDate: "desc" },
  });
  return latest?.resultValue ?? null;
}

async function findActivityBySlug(schoolId: string, slug: string) {
  return prisma.activity.findFirst({
    where: {
      slug,
      OR: [{ schoolId: null }, { schoolId }],
    },
  });
}

async function upsertWorkoutPerformanceMark(input: {
  sessionId: string;
  studentId: string;
  activityId: string;
  activitySlug: string;
  activityUnit: string;
  direction: ScoringDirection;
  schoolId: string;
  schoolYearId: string;
  organizationId: string;
  gradeLevel: number;
  testingDate: Date;
  value: number;
  enteredById?: string;
  weightAtTest?: number | null;
  relativeStrength?: number | null;
}) {
  const notes = workoutSessionNotes(input.sessionId);
  const previousBest = await getPreviousBest(
    input.studentId,
    input.activityId,
    input.testingDate
  );
  const isPr = calculatePersonalRecord(
    input.value,
    previousBest,
    input.direction
  );

  await prisma.performanceResult.deleteMany({
    where: {
      studentId: input.studentId,
      activityId: input.activityId,
      notes,
      entryMethod: "WORKOUT",
    },
  });

  const student = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: input.studentId },
    select: { dateOfBirth: true },
  });

  await prisma.performanceResult.create({
    data: {
      studentId: input.studentId,
      activityId: input.activityId,
      schoolId: input.schoolId,
      schoolYearId: input.schoolYearId,
      organizationId: input.organizationId,
      gradeLevel: input.gradeLevel,
      resultValue: input.value,
      displayValue: formatActivityValue(
        input.value,
        input.activityUnit,
        input.activitySlug
      ),
      attemptNumber: 1,
      isBestAttempt: true,
      isPersonalRecord: isPr,
      testingDate: input.testingDate,
      status: "COMPLETED",
      entryMethod: "WORKOUT",
      notes,
      enteredById: input.enteredById,
      ageAtTest: ageAtDate(student.dateOfBirth, input.testingDate),
      weightAtTest: input.weightAtTest ?? undefined,
      relativeStrength: input.relativeStrength ?? undefined,
    },
  });
}

/**
 * Writes PerformanceResult rows from a completed workout so My Performance,
 * Progress, and Leaderboards stay in sync with program submissions.
 */
export async function syncWorkoutSessionToPerformance(
  sessionId: string,
  options?: { enteredById?: string }
): Promise<{ synced: number }> {
  const workoutSession = await prisma.workoutSession.findUnique({
    where: { id: sessionId },
    include: {
      student: { include: { enrollments: true } },
      setLogs: true,
      assignment: {
        include: {
          school: true,
          template: {
            include: {
              exercises: {
                include: { activity: true },
              },
            },
          },
        },
      },
    },
  });
  if (!workoutSession) return { synced: 0 };

  const { assignment, student, setLogs } = workoutSession;
  const schoolId = assignment.schoolId;
  const organizationId = assignment.school.organizationId;
  const testingDate = new Date(
    `${assignment.scheduledDate.toISOString().slice(0, 10)}T12:00:00`
  );

  const schoolYear = await resolveSchoolYear(schoolId, testingDate);
  if (!schoolYear) return { synced: 0 };

  const gradeLevel =
    student.enrollments.find((e) => e.schoolYearId === schoolYear.id)?.gradeLevel ??
    student.enrollments[0]?.gradeLevel ??
    DEFAULT_CLASS_YEAR;

  const bodyWeightLb = await getLatestBodyWeightLb(student.id, testingDate);
  let synced = 0;

  for (const exercise of assignment.template.exercises) {
    const activity = exercise.activity;
    const logsForExercise = setLogs.filter(
      (l) => l.templateExerciseId === exercise.id
    );
    const value = deriveWorkoutPerformanceValue(activity, logsForExercise);
    if (value == null) continue;

    const direction = activity.scoringDirection as ScoringDirection;
    const weightAtTest =
      activity.bodyweightInfluenced && bodyWeightLb ? bodyWeightLb : null;
    const relativeStrength =
      weightAtTest && activity.bodyweightInfluenced
        ? value / weightAtTest
        : null;

    await upsertWorkoutPerformanceMark({
      sessionId,
      studentId: student.id,
      activityId: activity.id,
      activitySlug: activity.slug,
      activityUnit: activity.unit,
      direction,
      schoolId,
      schoolYearId: schoolYear.id,
      organizationId,
      gradeLevel,
      testingDate,
      value,
      enteredById: options?.enteredById,
      weightAtTest,
      relativeStrength,
    });
    synced += 1;

    const relativeSlug = RELATIVE_SLUG_BY_ABSOLUTE[activity.slug];
    if (relativeSlug && bodyWeightLb && bodyWeightLb > 0) {
      const relativeActivity = await findActivityBySlug(schoolId, relativeSlug);
      if (relativeActivity) {
        const relativeValue =
          Math.round((value / bodyWeightLb) * 100) / 100;
        await upsertWorkoutPerformanceMark({
          sessionId,
          studentId: student.id,
          activityId: relativeActivity.id,
          activitySlug: relativeActivity.slug,
          activityUnit: relativeActivity.unit,
          direction: relativeActivity.scoringDirection as ScoringDirection,
          schoolId,
          schoolYearId: schoolYear.id,
          organizationId,
          gradeLevel,
          testingDate,
          value: relativeValue,
          enteredById: options?.enteredById,
          weightAtTest: bodyWeightLb,
          relativeStrength: relativeValue,
        });
        synced += 1;
      }
    }
  }

  return { synced };
}
