import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type PerformanceAuditEventType =
  | "CREATED"
  | "SUPERSEDED"
  | "ARCHIVED_SESSION"
  | "TESTING_DATE_SHIFTED"
  | "WORKOUT_SYNCED";

type AuditInput = {
  eventType: PerformanceAuditEventType;
  resultId?: string | null;
  studentId: string;
  activityId: string;
  schoolId: string;
  actorUserId?: string | null;
  payload: Prisma.InputJsonValue;
};

/** Append-only write. Never update or delete audit rows from app code. */
export async function recordPerformanceAudit(
  input: AuditInput,
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma;
  return db.performanceAuditEvent.create({
    data: {
      eventType: input.eventType,
      resultId: input.resultId ?? undefined,
      studentId: input.studentId,
      activityId: input.activityId,
      schoolId: input.schoolId,
      actorUserId: input.actorUserId ?? undefined,
      payload: input.payload,
    },
  });
}

export async function recordPerformanceAudits(
  inputs: AuditInput[],
  tx?: Prisma.TransactionClient
) {
  if (inputs.length === 0) return;
  const db = tx ?? prisma;
  await db.performanceAuditEvent.createMany({
    data: inputs.map((input) => ({
      eventType: input.eventType,
      resultId: input.resultId ?? undefined,
      studentId: input.studentId,
      activityId: input.activityId,
      schoolId: input.schoolId,
      actorUserId: input.actorUserId ?? undefined,
      payload: input.payload,
    })),
  });
}
