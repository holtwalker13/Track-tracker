-- Daily present/absent marks for a class roster (YYYY-MM-DD, no timezone shift).
CREATE TABLE "ClassAttendance" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL,
    "recordedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassAttendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClassAttendance_classId_studentId_date_key" ON "ClassAttendance"("classId", "studentId", "date");
CREATE INDEX "ClassAttendance_schoolId_date_idx" ON "ClassAttendance"("schoolId", "date");
CREATE INDEX "ClassAttendance_classId_date_idx" ON "ClassAttendance"("classId", "date");
CREATE INDEX "ClassAttendance_studentId_idx" ON "ClassAttendance"("studentId");

ALTER TABLE "ClassAttendance" ADD CONSTRAINT "ClassAttendance_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassAttendance" ADD CONSTRAINT "ClassAttendance_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassAttendance" ADD CONSTRAINT "ClassAttendance_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
