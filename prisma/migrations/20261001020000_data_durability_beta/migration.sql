-- Data durability for beta: chronology fields, soft-archive, audit trail, volume indexes.
-- All changes are additive — no DROP / data wipe.

-- AlterTable
ALTER TABLE "CoachProfile" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "CoachProfile" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ClassEnrollment" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "WorkoutSetLog" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "TestingSession" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "TestingSession" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
-- Backfill recordedAt from createdAt so historical chronology is preserved.
ALTER TABLE "PerformanceResult" ADD COLUMN IF NOT EXISTS "recordedAt" TIMESTAMP(3);
UPDATE "PerformanceResult" SET "recordedAt" = "createdAt" WHERE "recordedAt" IS NULL;
ALTER TABLE "PerformanceResult" ALTER COLUMN "recordedAt" SET NOT NULL;
ALTER TABLE "PerformanceResult" ALTER COLUMN "recordedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "PerformanceResult" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PerformanceAuditEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "resultId" TEXT,
    "studentId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (IF NOT EXISTS via DO blocks where needed for idempotency on legacy db-push DBs)
CREATE INDEX IF NOT EXISTS "PerformanceAuditEvent_studentId_createdAt_idx" ON "PerformanceAuditEvent"("studentId", "createdAt");
CREATE INDEX IF NOT EXISTS "PerformanceAuditEvent_schoolId_createdAt_idx" ON "PerformanceAuditEvent"("schoolId", "createdAt");
CREATE INDEX IF NOT EXISTS "PerformanceAuditEvent_resultId_idx" ON "PerformanceAuditEvent"("resultId");
CREATE INDEX IF NOT EXISTS "PerformanceAuditEvent_activityId_createdAt_idx" ON "PerformanceAuditEvent"("activityId", "createdAt");
CREATE INDEX IF NOT EXISTS "CoachProfile_schoolId_idx" ON "CoachProfile"("schoolId");
CREATE INDEX IF NOT EXISTS "Class_schoolId_idx" ON "Class"("schoolId");
CREATE INDEX IF NOT EXISTS "Class_coachId_idx" ON "Class"("coachId");
CREATE INDEX IF NOT EXISTS "ClassEnrollment_classId_idx" ON "ClassEnrollment"("classId");
CREATE INDEX IF NOT EXISTS "WorkoutSetLog_sessionId_createdAt_idx" ON "WorkoutSetLog"("sessionId", "createdAt");
CREATE INDEX IF NOT EXISTS "TestingSession_schoolId_archivedAt_idx" ON "TestingSession"("schoolId", "archivedAt");
CREATE INDEX IF NOT EXISTS "TestingSessionActivity_activityId_idx" ON "TestingSessionActivity"("activityId");
CREATE INDEX IF NOT EXISTS "TestingSessionStudent_studentId_idx" ON "TestingSessionStudent"("studentId");
CREATE INDEX IF NOT EXISTS "PerformanceResult_studentId_testingDate_idx" ON "PerformanceResult"("studentId", "testingDate");
CREATE INDEX IF NOT EXISTS "PerformanceResult_studentId_recordedAt_idx" ON "PerformanceResult"("studentId", "recordedAt");
CREATE INDEX IF NOT EXISTS "PerformanceResult_schoolId_status_testingDate_idx" ON "PerformanceResult"("schoolId", "status", "testingDate");
