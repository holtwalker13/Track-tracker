import { prisma } from "@/lib/db";
import type { EntryMethod, ResultStatus, ScoringDirection } from "@/lib/constants";
import { ageAtDate, formatActivityValue } from "@/lib/format";
import {
  calculatePersonalRecord,
  pickBestAttempt,
  validateRealisticValue,
} from "@/lib/services/performance";
import { recordPerformanceAudits } from "@/lib/services/performance-audit";

export async function getPreviousBest(
  studentId: string,
  activityId: string,
  beforeDate?: Date
): Promise<number | null> {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { scoringDirection: true },
  });
  const direction = (activity?.scoringDirection ?? "HIGHER_BETTER") as ScoringDirection;

  // isBestAttempt = best of that session's attempts — career prev-best must still
  // respect LOWER_BETTER (faster time) vs HIGHER_BETTER (farther/heavier).
  const results = await prisma.performanceResult.findMany({
    where: {
      studentId,
      activityId,
      status: "COMPLETED",
      isBestAttempt: true,
      resultValue: { not: null },
      ...(beforeDate ? { testingDate: { lt: beforeDate } } : {}),
    },
    select: { resultValue: true },
  });

  const values = results
    .map((r) => r.resultValue)
    .filter((v): v is number => v != null && Number.isFinite(v));
  return pickBestAttempt(values, direction);
}

type ExistingAttempt = {
  id: string;
  attemptNumber: number;
  resultValue: number | null;
  status: string;
  displayValue: string | null;
  isBestAttempt: boolean;
  isPersonalRecord: boolean;
};

function sameAttemptValue(
  existing: ExistingAttempt | undefined,
  nextValue: number | null,
  nextStatus: string
): boolean {
  if (!existing) return false;
  if (existing.status !== nextStatus) return false;
  if (nextValue == null) return existing.resultValue == null;
  return existing.resultValue === nextValue;
}

/**
 * Save live/session attempts without hard-deleting history.
 * Unchanged rows are kept (recordedAt preserved). Changed/removed rows are
 * marked SUPERSEDED and replaced so progress chronology stays reconstructable.
 */
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
    return prisma.$transaction(async (tx) => {
      const existing = await tx.performanceResult.findMany({
        where: {
          studentId: input.studentId,
          activityId: input.activityId,
          testingSessionId: input.testingSessionId,
          status: { not: "SUPERSEDED" },
        },
      });

      if (
        existing.length === 1 &&
        existing[0]!.status === input.status &&
        existing[0]!.resultValue == null
      ) {
        return { saved: true as const, pr: false };
      }

      if (existing.length > 0) {
        await tx.performanceResult.updateMany({
          where: { id: { in: existing.map((r) => r.id) } },
          data: { status: "SUPERSEDED" },
        });
      }

      const created = await tx.performanceResult.create({
        data: {
          studentId: input.studentId,
          activityId: input.activityId,
          testingSessionId: input.testingSessionId,
          schoolId: input.schoolId,
          schoolYearId: input.schoolYearId,
          organizationId: input.organizationId,
          gradeLevel: input.gradeLevel,
          testingDate: input.testingDate,
          status: input.status!,
          enteredById: input.enteredById,
          entryMethod: input.entryMethod,
          ageAtTest: ageAtDate(student.dateOfBirth, input.testingDate),
          weightAtTest: input.weightAtTest,
          heightAtTest: input.heightAtTest,
          isBestAttempt: true,
          supersedesId: existing[0]?.id,
        },
      });

      await recordPerformanceAudits(
        [
          ...existing.map((r) => ({
            eventType: "SUPERSEDED" as const,
            resultId: r.id,
            studentId: input.studentId,
            activityId: input.activityId,
            schoolId: input.schoolId,
            actorUserId: input.enteredById,
            payload: {
              reason: "status_change",
              previousStatus: r.status,
              nextStatus: input.status,
              supersededBy: created.id,
            },
          })),
          {
            eventType: "CREATED" as const,
            resultId: created.id,
            studentId: input.studentId,
            activityId: input.activityId,
            schoolId: input.schoolId,
            actorUserId: input.enteredById,
            payload: {
              status: input.status,
              testingSessionId: input.testingSessionId,
              testingDate: input.testingDate.toISOString(),
              entryMethod: input.entryMethod,
            },
          },
        ],
        tx
      );

      return { saved: true as const, pr: false };
    });
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
  const isPr = calculatePersonalRecord(best, previousBest, direction);

  const relativeStrength =
    activity.bodyweightInfluenced && input.weightAtTest
      ? best / input.weightAtTest
      : null;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.performanceResult.findMany({
      where: {
        studentId: input.studentId,
        activityId: input.activityId,
        testingSessionId: input.testingSessionId,
        status: { not: "SUPERSEDED" },
      },
      orderBy: { attemptNumber: "asc" },
    });

    const byAttempt = new Map<number, ExistingAttempt>();
    for (const row of existing) {
      byAttempt.set(row.attemptNumber, row);
    }

    const desiredAttemptNumbers = new Set(
      numericAttempts.map((_, i) => i + 1)
    );
    const toSupersedeIds: string[] = [];
    const auditInputs: Parameters<typeof recordPerformanceAudits>[0] = [];

    for (const row of existing) {
      if (!desiredAttemptNumbers.has(row.attemptNumber)) {
        toSupersedeIds.push(row.id);
      } else {
        const nextVal = numericAttempts[row.attemptNumber - 1]!;
        if (!sameAttemptValue(row, nextVal, "COMPLETED")) {
          toSupersedeIds.push(row.id);
        }
      }
    }

    if (toSupersedeIds.length > 0) {
      await tx.performanceResult.updateMany({
        where: { id: { in: toSupersedeIds } },
        data: { status: "SUPERSEDED", isBestAttempt: false, isPersonalRecord: false },
      });
      for (const id of toSupersedeIds) {
        const prev = existing.find((r) => r.id === id)!;
        auditInputs.push({
          eventType: "SUPERSEDED",
          resultId: id,
          studentId: input.studentId,
          activityId: input.activityId,
          schoolId: input.schoolId,
          actorUserId: input.enteredById,
          payload: {
            reason: "attempt_replaced",
            attemptNumber: prev.attemptNumber,
            previousValue: prev.resultValue,
          },
        });
      }
    }

    const keptIds = new Set(
      existing.filter((r) => !toSupersedeIds.includes(r.id)).map((r) => r.id)
    );

    for (let i = 0; i < numericAttempts.length; i++) {
      const val = numericAttempts[i]!;
      const attemptNumber = i + 1;
      const isBest = val === best;
      const prior = byAttempt.get(attemptNumber);

      if (prior && keptIds.has(prior.id)) {
        // Value unchanged — refresh best/PR flags without moving recordedAt.
        await tx.performanceResult.update({
          where: { id: prior.id },
          data: {
            isBestAttempt: isBest,
            isPersonalRecord: isBest && isPr,
            relativeStrength: isBest ? relativeStrength : null,
            testingDate: input.testingDate,
            weightAtTest: input.weightAtTest,
            heightAtTest: input.heightAtTest,
          },
        });
        continue;
      }

      const created = await tx.performanceResult.create({
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
          attemptNumber,
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
          supersedesId: prior && toSupersedeIds.includes(prior.id) ? prior.id : undefined,
        },
      });

      auditInputs.push({
        eventType: "CREATED",
        resultId: created.id,
        studentId: input.studentId,
        activityId: input.activityId,
        schoolId: input.schoolId,
        actorUserId: input.enteredById,
        payload: {
          attemptNumber,
          resultValue: val,
          testingSessionId: input.testingSessionId,
          testingDate: input.testingDate.toISOString(),
          entryMethod: input.entryMethod,
          supersedesId: created.supersedesId,
        },
      });
    }

    // Ensure only one best attempt among active rows for this session cell.
    const active = await tx.performanceResult.findMany({
      where: {
        studentId: input.studentId,
        activityId: input.activityId,
        testingSessionId: input.testingSessionId,
        status: "COMPLETED",
      },
    });
    for (const row of active) {
      const shouldBest = row.resultValue === best;
      if (row.isBestAttempt !== shouldBest || (shouldBest && row.isPersonalRecord !== isPr)) {
        await tx.performanceResult.update({
          where: { id: row.id },
          data: {
            isBestAttempt: shouldBest,
            isPersonalRecord: shouldBest && isPr,
            relativeStrength: shouldBest ? relativeStrength : null,
          },
        });
      }
    }

    await recordPerformanceAudits(auditInputs, tx);

    return { saved: true as const, pr: isPr, best, warning };
  });
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

  // getPreviousBest uses testingDate < beforeDate, so the row being corrected
  // (same testingDate) is already excluded from the career comparison.
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

  return prisma.$transaction(async (tx) => {
    await tx.performanceResult.update({
      where: { id: resultId },
      data: { status: "SUPERSEDED", isBestAttempt: false, isPersonalRecord: false },
    });

    const created = await tx.performanceResult.create({
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

    await recordPerformanceAudits(
      [
        {
          eventType: "SUPERSEDED",
          resultId,
          studentId: existing.studentId,
          activityId: existing.activityId,
          schoolId: existing.schoolId,
          actorUserId: enteredById,
          payload: {
            reason: "correction",
            previousValue: existing.resultValue,
            supersededBy: created.id,
          },
        },
        {
          eventType: "CREATED",
          resultId: created.id,
          studentId: existing.studentId,
          activityId: existing.activityId,
          schoolId: existing.schoolId,
          actorUserId: enteredById,
          payload: {
            reason: "correction",
            resultValue: newValue,
            supersedesId: resultId,
          },
        },
      ],
      tx
    );

    return created;
  });
}
