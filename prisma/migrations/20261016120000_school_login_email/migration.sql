-- School-email sign-in: confirmation timestamp and admin domain exceptions.
ALTER TABLE "User" ADD COLUMN "schoolEmailConfirmedAt" TIMESTAMP(3);

CREATE TABLE "SchoolLoginEmailException" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolLoginEmailException_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SchoolLoginEmailException_schoolId_email_key" ON "SchoolLoginEmailException"("schoolId", "email");
CREATE INDEX "SchoolLoginEmailException_schoolId_idx" ON "SchoolLoginEmailException"("schoolId");

ALTER TABLE "SchoolLoginEmailException" ADD CONSTRAINT "SchoolLoginEmailException_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
