-- Roster-upload email used for class join and sign-in when it differs from the internal login email.
ALTER TABLE "StudentProfile" ADD COLUMN "rosterEmail" TEXT;

CREATE INDEX "StudentProfile_rosterEmail_idx" ON "StudentProfile"("rosterEmail");

CREATE UNIQUE INDEX "StudentProfile_schoolId_rosterEmail_key"
  ON "StudentProfile"("schoolId", "rosterEmail")
  WHERE "rosterEmail" IS NOT NULL;
