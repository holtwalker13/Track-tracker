-- AlterTable
ALTER TABLE "KpiSet" ADD COLUMN IF NOT EXISTS "classId" TEXT;
ALTER TABLE "KpiSet" ADD COLUMN IF NOT EXISTS "subgroupId" TEXT;

-- AlterTable
ALTER TABLE "WorkoutAssignment" ADD COLUMN IF NOT EXISTS "subgroupId" TEXT;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "KpiSet" ADD CONSTRAINT "KpiSet_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "KpiSet" ADD CONSTRAINT "KpiSet_subgroupId_fkey" FOREIGN KEY ("subgroupId") REFERENCES "ClassSubgroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "WorkoutAssignment" ADD CONSTRAINT "WorkoutAssignment_subgroupId_fkey" FOREIGN KEY ("subgroupId") REFERENCES "ClassSubgroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "KpiSet_classId_idx" ON "KpiSet"("classId");
CREATE INDEX IF NOT EXISTS "KpiSet_subgroupId_idx" ON "KpiSet"("subgroupId");
