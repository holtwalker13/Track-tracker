-- Saved workouts can belong to a class so coaches on that class share them.
ALTER TABLE "WorkoutTemplate" ADD COLUMN "classId" TEXT;
CREATE INDEX "WorkoutTemplate_classId_idx" ON "WorkoutTemplate"("classId");
ALTER TABLE "WorkoutTemplate" ADD CONSTRAINT "WorkoutTemplate_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
