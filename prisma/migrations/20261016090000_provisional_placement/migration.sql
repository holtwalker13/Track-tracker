-- Where a walk-up student is placed besides class attendance.
ALTER TABLE "StudentProfile" ADD COLUMN "provisionalInWorkouts" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "StudentProfile" ADD COLUMN "provisionalInTests" BOOLEAN NOT NULL DEFAULT false;
