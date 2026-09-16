import { prisma } from "@/lib/db";
import type { EntryMethod, ResultStatus, ScoringDirection } from "@/lib/constants";
import { ageAtDate, formatActivityValue } from "@/lib/format";
import {
  calculatePersonalRecord,
  pickBestAttempt,
  validateRealisticValue,
} from "@/lib/services/performance";

export async function getPreviousBest(
  studentId: string,
  activityId: string,
  beforeDate?: Date
): Promise<number | null> {
  const results = await prisma.performanceResult.findMany({
    where: {
      studentId,
      activityId,
      status: "COMPLETED",
      isBestAttempt: true,
      ...(beforeDate ? { testingDate: { lt: beforeDate } } : {}),
    },
    orderBy: { testingDate: "desc" },
    take: 1,
  });
  return results[0]?.resultValue ?? null;
}

export async function saveAttemptResults(input: {
  studentId: string;
  activityId: string;
  testingSessionId: string;
  schoolId: string;
  schoolYearId: string;
  organizationId: string;
  gradeLevel: number;
  testingDate: Date;
  attempts: (number | null)[];
  status?: ResultStatus;
  enteredById?: string;
  entryMethod: EntryMethod;
  weightAtTest?: number;
  heightAtTest?: number;
}) {
  const activity = await prisma.activity.findUniqueOrThrow({
    where: { id: input.activityId },
  });
  const student = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: input.studentId },
  });

  if (input.status && input.status !== "COMPLETED") {
    await prisma.performanceResult.create({
      data: {
        studentId: input.studentId,
        activityId: input.activityId,
        testingSessionId: input.testingSessionId,
        schoolId: input.schoolId,
        schoolYearId: input.schoolYearId,
        organizationId: input.organizationId,
        gradeLevel: input.gradeLevel,
        testingDate: input.testingDate,
        status: input.status,
        enteredById: input.enteredById,
        entryMethod: input.entryMethod,
        ageAtTest: ageAtDate(student.dateOfBirth, input.testingDate),
        weightAtTest: input.weightAtTest,
        heightAtTest: input.heightAtTest,
        isBestAttempt: true,
      },
    });
    return { saved: true, pr: false };
  }

  const numericAttempts = input.attempts.filter(
    (a): a is number => a != null && !Number.isNaN(a)
  );
  const direction = activity.scoringDirection as ScoringDirection;
  const best = pickBestAttempt(numericAttempts, direction);
  if (best == null) return { saved: false, pr: false };

  const warning = validateRealisticValue(
    best,
    activity.minRealistic,
    activity.maxRealistic
  );

  const previousBest = await getPreviousBest(
    input.studentId,
    input.activityId,
    input.testingDate
  );
  const isPr = calculatePersonalRecord(
    best,
    previousBest,
    direction
  );

  await prisma.performanceResult.updateMany({
    where: {
      studentId: input.studentId,
      activityId: input.activityId,
      testingSessionId: input.testingSessionId,
    },
    data: { isBestAttempt: false },
  });

  const relativeStrength =
    activity.bodyweightInfluenced && input.weightAtTest
      ? best / input.weightAtTest
      : null;

  for (let i = 0; i < numericAttempts.length; i++) {
    const val = numericAttempts[i];
    const isBest = val === best;
    await prisma.performanceResult.create({
      data: {
        studentId: input.studentId,
        activityId: input.activityId,
        testingSessionId: input.testingSessionId,
        schoolId: input.schoolId,
        schoolYearId: input.schoolYearId,
        organizationId: input.organizationId,
        gradeLevel: input.gradeLevel,
        resultValue: val,
        displayValue: formatActivityValue(val, activity.unit, activity.slug),
        attemptNumber: i + 1,
        isBestAttempt: isBest,
        isPersonalRecord: isBest && isPr,
        testingDate: input.testingDate,
        status: "COMPLETED",
        enteredById: input.enteredById,
        entryMethod: input.entryMethod,
        ageAtTest: ageAtDate(student.dateOfBirth, input.testingDate),
        weightAtTest: input.weightAtTest,
        heightAtTest: input.heightAtTest,
        relativeStrength: isBest ? relativeStrength : null,
      },
    });
  }

  return { saved: true, pr: isPr, best, warning };
}

export async function correctResult(
  resultId: string,
  newValue: number,
  enteredById: string
) {
  const existing = await prisma.performanceResult.findUniqueOrThrow({
    where: { id: resultId },
    include: { activity: true },
  });
  if (existing.status === "SUPERSEDED") throw new Error("Already superseded");

  await prisma.performanceResult.update({
    where: { id: resultId },
    data: { status: "SUPERSEDED" },
  });

  const previousBest = await getPreviousBest(
    existing.studentId,
    existing.activityId,
    existing.testingDate
  );
  const isPr = calculatePersonalRecord(
    newValue,
    previousBest,
    existing.activity.scoringDirection as ScoringDirection
  );

  return prisma.performanceResult.create({
    data: {
      studentId: existing.studentId,
      activityId: existing.activityId,
      testingSessionId: existing.testingSessionId,
      schoolId: existing.schoolId,
      schoolYearId: existing.schoolYearId,
      organizationId: existing.organizationId,
      gradeLevel: existing.gradeLevel,
      resultValue: newValue,
      displayValue: formatActivityValue(
        newValue,
        existing.activity.unit,
        existing.activity.slug
      ),
      attemptNumber: existing.attemptNumber,
      isBestAttempt: true,
      isPersonalRecord: isPr,
      testingDate: existing.testingDate,
      status: "COMPLETED",
      enteredById,
      entryMethod: "MANUAL",
      ageAtTest: existing.ageAtTest,
      weightAtTest: existing.weightAtTest,
      heightAtTest: existing.heightAtTest,
      supersedesId: resultId,
      notes: "Correction",
    },
  });
}
