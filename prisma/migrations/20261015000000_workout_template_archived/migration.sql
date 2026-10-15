-- Hide a coach's saved workout without deleting calendar days or athlete logs.
ALTER TABLE "WorkoutTemplate" ADD COLUMN "archivedAt" TIMESTAMP(3);
