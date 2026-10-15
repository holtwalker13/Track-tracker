-- Walk-up athletes. Existing roster rows stay official.
ALTER TABLE "StudentProfile" ADD COLUMN "provisional" BOOLEAN NOT NULL DEFAULT false;
