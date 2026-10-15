-- Coach-set starting 1RM (lb) per student and lift, used for % prescriptions before any logged mark.
CREATE TABLE "StudentCoreOneRepMax" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "valueLb" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentCoreOneRepMax_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentCoreOneRepMax_studentId_activityId_key" ON "StudentCoreOneRepMax"("studentId", "activityId");
CREATE INDEX "StudentCoreOneRepMax_studentId_idx" ON "StudentCoreOneRepMax"("studentId");

ALTER TABLE "StudentCoreOneRepMax" ADD CONSTRAINT "StudentCoreOneRepMax_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentCoreOneRepMax" ADD CONSTRAINT "StudentCoreOneRepMax_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
