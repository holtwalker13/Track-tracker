-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "benchmarkSharingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "showNamesOnLeaderboardsForStudents" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OrganizationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "districtId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolHiddenLift" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "activitySlug" TEXT NOT NULL,

    CONSTRAINT "SchoolHiddenLift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolKpiTarget" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "medal" TEXT NOT NULL,
    "metricSlug" TEXT NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "ageBracket" TEXT NOT NULL DEFAULT 'high-9-12',

    CONSTRAINT "SchoolKpiTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolHiddenKpi" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "metricSlug" TEXT NOT NULL,

    CONSTRAINT "SchoolHiddenKpi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolYear" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SchoolYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "passwordSetAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "activeKpiSetId" TEXT,

    CONSTRAINT "CoachProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachLoginInvite" (
    "id" TEXT NOT NULL,
    "coachProfileId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachLoginInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiSet" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "coachProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "duplicatedFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiSetMetric" (
    "id" TEXT NOT NULL,
    "kpiSetId" TEXT NOT NULL,
    "metricSlug" TEXT NOT NULL,
    "ranked" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "KpiSetMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiSetTarget" (
    "id" TEXT NOT NULL,
    "kpiSetId" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "medal" TEXT NOT NULL,
    "metricSlug" TEXT NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "ageBracket" TEXT NOT NULL DEFAULT 'high-9-12',

    CONSTRAINT "KpiSetTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "schoolId" TEXT NOT NULL,
    "studentNumber" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT,
    "sports" TEXT,
    "participationType" TEXT,
    "notes" TEXT,
    "anonymousId" TEXT NOT NULL,
    "nameHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentLoginInvite" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentLoginInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentEnrollment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,

    CONSTRAINT "StudentEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "coachId" TEXT,
    "name" TEXT NOT NULL,
    "period" TEXT,
    "gradeLevel" INTEGER,
    "programKind" TEXT,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSubgroup" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassSubgroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSubgroupMember" (
    "id" TEXT NOT NULL,
    "subgroupId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "ClassSubgroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassCoach" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassCoach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassEnrollment" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "ClassEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ActivityCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "scoringDirection" TEXT NOT NULL,
    "acceptsDecimals" BOOLEAN NOT NULL DEFAULT true,
    "minRealistic" DOUBLE PRECISION,
    "maxRealistic" DOUBLE PRECISION,
    "bodyweightInfluenced" BOOLEAN NOT NULL DEFAULT false,
    "ageInfluenced" BOOLEAN NOT NULL DEFAULT true,
    "genderInfluenced" BOOLEAN NOT NULL DEFAULT false,
    "schoolId" TEXT,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutTemplate" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
    "generatorKey" TEXT,
    "generatorBlockId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutTemplateExercise" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "defaultSets" INTEGER NOT NULL DEFAULT 3,
    "defaultReps" INTEGER NOT NULL DEFAULT 5,
    "setPrescriptions" JSONB,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WorkoutTemplateExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutAssignment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "classId" TEXT,
    "studentId" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "generatorBlockId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSetLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "templateExerciseId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "weightLb" DOUBLE PRECISION,
    "reps" INTEGER,
    "rpe" DOUBLE PRECISION,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutSetLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestingSession" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "classId" TEXT,
    "name" TEXT NOT NULL,
    "testingDate" TIMESTAMP(3) NOT NULL,
    "gradeLevel" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'LIVE',
    "recordingUnlocked" BOOLEAN NOT NULL DEFAULT true,
    "liveOpenedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestingSessionActivity" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TestingSessionActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestingSessionStudent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "TestingSessionStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceResult" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "testingSessionId" TEXT,
    "schoolId" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "resultValue" DOUBLE PRECISION,
    "displayValue" TEXT,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "isBestAttempt" BOOLEAN NOT NULL DEFAULT false,
    "isPersonalRecord" BOOLEAN NOT NULL DEFAULT false,
    "testingDate" TIMESTAMP(3) NOT NULL,
    "ageAtTest" DOUBLE PRECISION,
    "weightAtTest" DOUBLE PRECISION,
    "heightAtTest" DOUBLE PRECISION,
    "enteredById" TEXT,
    "entryMethod" TEXT NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "supersedesId" TEXT,
    "relativeStrength" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenchmarkDataset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "datasetYear" INTEGER NOT NULL,
    "population" TEXT NOT NULL,
    "populationSize" INTEGER,
    "geographicRegion" TEXT,
    "methodologyNotes" TEXT,
    "isSynthetic" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,

    CONSTRAINT "BenchmarkDataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenchmarkValue" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "age" DOUBLE PRECISION,
    "gradeLevel" INTEGER,
    "gender" TEXT,
    "p25" DOUBLE PRECISION,
    "p50" DOUBLE PRECISION NOT NULL,
    "p75" DOUBLE PRECISION,
    "p90" DOUBLE PRECISION,

    CONSTRAINT "BenchmarkValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAchievement" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,

    CONSTRAINT "StudentAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentGamification" (
    "studentId" TEXT NOT NULL,
    "lifetimeXp" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentGamification_pkey" PRIMARY KEY ("studentId")
);

-- CreateTable
CREATE TABLE "XpTransaction" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccoladeDefinition" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '🏆',
    "category" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'STATIC',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,

    CONSTRAINT "AccoladeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAccolade" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "accoladeId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "StudentAccolade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DynamicAccoladeHolder" (
    "id" TEXT NOT NULL,
    "accoladeSlug" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DynamicAccoladeHolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSettings_organizationId_key" ON "OrganizationSettings"("organizationId");

-- CreateIndex
CREATE INDEX "District_organizationId_idx" ON "District"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");

-- CreateIndex
CREATE INDEX "School_organizationId_idx" ON "School"("organizationId");

-- CreateIndex
CREATE INDEX "School_districtId_idx" ON "School"("districtId");

-- CreateIndex
CREATE INDEX "SchoolHiddenLift_schoolId_idx" ON "SchoolHiddenLift"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolHiddenLift_schoolId_activitySlug_key" ON "SchoolHiddenLift"("schoolId", "activitySlug");

-- CreateIndex
CREATE INDEX "SchoolKpiTarget_schoolId_gender_idx" ON "SchoolKpiTarget"("schoolId", "gender");

-- CreateIndex
CREATE INDEX "SchoolKpiTarget_schoolId_ageBracket_idx" ON "SchoolKpiTarget"("schoolId", "ageBracket");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolKpiTarget_schoolId_gender_medal_metricSlug_ageBracket_key" ON "SchoolKpiTarget"("schoolId", "gender", "medal", "metricSlug", "ageBracket");

-- CreateIndex
CREATE INDEX "SchoolHiddenKpi_schoolId_idx" ON "SchoolHiddenKpi"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolHiddenKpi_schoolId_metricSlug_key" ON "SchoolHiddenKpi"("schoolId", "metricSlug");

-- CreateIndex
CREATE INDEX "SchoolYear_schoolId_idx" ON "SchoolYear"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolYear_schoolId_label_key" ON "SchoolYear"("schoolId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CoachProfile_userId_key" ON "CoachProfile"("userId");

-- CreateIndex
CREATE INDEX "CoachProfile_activeKpiSetId_idx" ON "CoachProfile"("activeKpiSetId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachLoginInvite_coachProfileId_key" ON "CoachLoginInvite"("coachProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachLoginInvite_tokenHash_key" ON "CoachLoginInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "CoachLoginInvite_expiresAt_idx" ON "CoachLoginInvite"("expiresAt");

-- CreateIndex
CREATE INDEX "KpiSet_schoolId_idx" ON "KpiSet"("schoolId");

-- CreateIndex
CREATE INDEX "KpiSet_coachProfileId_idx" ON "KpiSet"("coachProfileId");

-- CreateIndex
CREATE INDEX "KpiSet_isPublic_idx" ON "KpiSet"("isPublic");

-- CreateIndex
CREATE INDEX "KpiSet_sport_idx" ON "KpiSet"("sport");

-- CreateIndex
CREATE INDEX "KpiSet_schoolId_isDefault_idx" ON "KpiSet"("schoolId", "isDefault");

-- CreateIndex
CREATE INDEX "KpiSetMetric_kpiSetId_ranked_idx" ON "KpiSetMetric"("kpiSetId", "ranked");

-- CreateIndex
CREATE UNIQUE INDEX "KpiSetMetric_kpiSetId_metricSlug_key" ON "KpiSetMetric"("kpiSetId", "metricSlug");

-- CreateIndex
CREATE INDEX "KpiSetTarget_kpiSetId_gender_idx" ON "KpiSetTarget"("kpiSetId", "gender");

-- CreateIndex
CREATE INDEX "KpiSetTarget_kpiSetId_ageBracket_idx" ON "KpiSetTarget"("kpiSetId", "ageBracket");

-- CreateIndex
CREATE UNIQUE INDEX "KpiSetTarget_kpiSetId_gender_medal_metricSlug_ageBracket_key" ON "KpiSetTarget"("kpiSetId", "gender", "medal", "metricSlug", "ageBracket");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE INDEX "StudentProfile_schoolId_idx" ON "StudentProfile"("schoolId");

-- CreateIndex
CREATE INDEX "StudentProfile_anonymousId_idx" ON "StudentProfile"("anonymousId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_schoolId_studentNumber_key" ON "StudentProfile"("schoolId", "studentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_schoolId_username_key" ON "StudentProfile"("schoolId", "username");

-- CreateIndex
CREATE UNIQUE INDEX "StudentLoginInvite_studentId_key" ON "StudentLoginInvite"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentLoginInvite_tokenHash_key" ON "StudentLoginInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "StudentLoginInvite_expiresAt_idx" ON "StudentLoginInvite"("expiresAt");

-- CreateIndex
CREATE INDEX "StudentEnrollment_schoolYearId_gradeLevel_idx" ON "StudentEnrollment"("schoolYearId", "gradeLevel");

-- CreateIndex
CREATE UNIQUE INDEX "StudentEnrollment_studentId_schoolYearId_key" ON "StudentEnrollment"("studentId", "schoolYearId");

-- CreateIndex
CREATE INDEX "ClassSubgroup_classId_idx" ON "ClassSubgroup"("classId");

-- CreateIndex
CREATE INDEX "ClassSubgroupMember_studentId_idx" ON "ClassSubgroupMember"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSubgroupMember_subgroupId_studentId_key" ON "ClassSubgroupMember"("subgroupId", "studentId");

-- CreateIndex
CREATE INDEX "ClassCoach_coachId_idx" ON "ClassCoach"("coachId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassCoach_classId_coachId_key" ON "ClassCoach"("classId", "coachId");

-- CreateIndex
CREATE INDEX "ClassEnrollment_studentId_idx" ON "ClassEnrollment"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassEnrollment_classId_studentId_key" ON "ClassEnrollment"("classId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityCategory_slug_key" ON "ActivityCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_slug_key" ON "Activity"("slug");

-- CreateIndex
CREATE INDEX "Activity_schoolId_idx" ON "Activity"("schoolId");

-- CreateIndex
CREATE INDEX "WorkoutTemplate_schoolId_idx" ON "WorkoutTemplate"("schoolId");

-- CreateIndex
CREATE INDEX "WorkoutTemplate_generatorBlockId_idx" ON "WorkoutTemplate"("generatorBlockId");

-- CreateIndex
CREATE INDEX "WorkoutTemplateExercise_templateId_idx" ON "WorkoutTemplateExercise"("templateId");

-- CreateIndex
CREATE INDEX "WorkoutAssignment_schoolId_scheduledDate_idx" ON "WorkoutAssignment"("schoolId", "scheduledDate");

-- CreateIndex
CREATE INDEX "WorkoutAssignment_classId_scheduledDate_idx" ON "WorkoutAssignment"("classId", "scheduledDate");

-- CreateIndex
CREATE INDEX "WorkoutAssignment_studentId_scheduledDate_idx" ON "WorkoutAssignment"("studentId", "scheduledDate");

-- CreateIndex
CREATE INDEX "WorkoutAssignment_generatorBlockId_idx" ON "WorkoutAssignment"("generatorBlockId");

-- CreateIndex
CREATE INDEX "WorkoutSession_studentId_idx" ON "WorkoutSession"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutSession_assignmentId_studentId_key" ON "WorkoutSession"("assignmentId", "studentId");

-- CreateIndex
CREATE INDEX "WorkoutSetLog_sessionId_idx" ON "WorkoutSetLog"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutSetLog_sessionId_templateExerciseId_setNumber_key" ON "WorkoutSetLog"("sessionId", "templateExerciseId", "setNumber");

-- CreateIndex
CREATE INDEX "TestingSession_schoolId_schoolYearId_idx" ON "TestingSession"("schoolId", "schoolYearId");

-- CreateIndex
CREATE INDEX "TestingSession_testingDate_idx" ON "TestingSession"("testingDate");

-- CreateIndex
CREATE UNIQUE INDEX "TestingSessionActivity_sessionId_activityId_key" ON "TestingSessionActivity"("sessionId", "activityId");

-- CreateIndex
CREATE UNIQUE INDEX "TestingSessionStudent_sessionId_studentId_key" ON "TestingSessionStudent"("sessionId", "studentId");

-- CreateIndex
CREATE INDEX "PerformanceResult_studentId_activityId_idx" ON "PerformanceResult"("studentId", "activityId");

-- CreateIndex
CREATE INDEX "PerformanceResult_schoolId_schoolYearId_gradeLevel_idx" ON "PerformanceResult"("schoolId", "schoolYearId", "gradeLevel");

-- CreateIndex
CREATE INDEX "PerformanceResult_activityId_schoolId_testingDate_idx" ON "PerformanceResult"("activityId", "schoolId", "testingDate");

-- CreateIndex
CREATE INDEX "PerformanceResult_testingSessionId_idx" ON "PerformanceResult"("testingSessionId");

-- CreateIndex
CREATE INDEX "PerformanceResult_studentId_activityId_isBestAttempt_idx" ON "PerformanceResult"("studentId", "activityId", "isBestAttempt");

-- CreateIndex
CREATE INDEX "BenchmarkValue_activityId_gradeLevel_idx" ON "BenchmarkValue"("activityId", "gradeLevel");

-- CreateIndex
CREATE INDEX "BenchmarkValue_activityId_age_idx" ON "BenchmarkValue"("activityId", "age");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_slug_key" ON "Achievement"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAchievement_studentId_achievementId_key" ON "StudentAchievement"("studentId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "XpTransaction_sourceKey_key" ON "XpTransaction"("sourceKey");

-- CreateIndex
CREATE INDEX "XpTransaction_studentId_createdAt_idx" ON "XpTransaction"("studentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccoladeDefinition_slug_key" ON "AccoladeDefinition"("slug");

-- CreateIndex
CREATE INDEX "StudentAccolade_studentId_idx" ON "StudentAccolade"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAccolade_studentId_accoladeId_key" ON "StudentAccolade"("studentId", "accoladeId");

-- CreateIndex
CREATE INDEX "DynamicAccoladeHolder_studentId_idx" ON "DynamicAccoladeHolder"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "DynamicAccoladeHolder_accoladeSlug_scopeType_scopeId_period_key" ON "DynamicAccoladeHolder"("accoladeSlug", "scopeType", "scopeId", "periodType", "periodKey");

-- AddForeignKey
ALTER TABLE "OrganizationSettings" ADD CONSTRAINT "OrganizationSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "District" ADD CONSTRAINT "District_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolHiddenLift" ADD CONSTRAINT "SchoolHiddenLift_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolKpiTarget" ADD CONSTRAINT "SchoolKpiTarget_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolHiddenKpi" ADD CONSTRAINT "SchoolHiddenKpi_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolYear" ADD CONSTRAINT "SchoolYear_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachProfile" ADD CONSTRAINT "CoachProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachProfile" ADD CONSTRAINT "CoachProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachProfile" ADD CONSTRAINT "CoachProfile_activeKpiSetId_fkey" FOREIGN KEY ("activeKpiSetId") REFERENCES "KpiSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachLoginInvite" ADD CONSTRAINT "CoachLoginInvite_coachProfileId_fkey" FOREIGN KEY ("coachProfileId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiSet" ADD CONSTRAINT "KpiSet_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiSet" ADD CONSTRAINT "KpiSet_coachProfileId_fkey" FOREIGN KEY ("coachProfileId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiSet" ADD CONSTRAINT "KpiSet_duplicatedFromId_fkey" FOREIGN KEY ("duplicatedFromId") REFERENCES "KpiSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiSetMetric" ADD CONSTRAINT "KpiSetMetric_kpiSetId_fkey" FOREIGN KEY ("kpiSetId") REFERENCES "KpiSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiSetTarget" ADD CONSTRAINT "KpiSetTarget_kpiSetId_fkey" FOREIGN KEY ("kpiSetId") REFERENCES "KpiSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLoginInvite" ADD CONSTRAINT "StudentLoginInvite_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubgroup" ADD CONSTRAINT "ClassSubgroup_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubgroupMember" ADD CONSTRAINT "ClassSubgroupMember_subgroupId_fkey" FOREIGN KEY ("subgroupId") REFERENCES "ClassSubgroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSubgroupMember" ADD CONSTRAINT "ClassSubgroupMember_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassCoach" ADD CONSTRAINT "ClassCoach_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassCoach" ADD CONSTRAINT "ClassCoach_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ActivityCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutTemplate" ADD CONSTRAINT "WorkoutTemplate_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutTemplate" ADD CONSTRAINT "WorkoutTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutTemplateExercise" ADD CONSTRAINT "WorkoutTemplateExercise_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutTemplateExercise" ADD CONSTRAINT "WorkoutTemplateExercise_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutAssignment" ADD CONSTRAINT "WorkoutAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutAssignment" ADD CONSTRAINT "WorkoutAssignment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutAssignment" ADD CONSTRAINT "WorkoutAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutAssignment" ADD CONSTRAINT "WorkoutAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutAssignment" ADD CONSTRAINT "WorkoutAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "WorkoutAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSetLog" ADD CONSTRAINT "WorkoutSetLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSetLog" ADD CONSTRAINT "WorkoutSetLog_templateExerciseId_fkey" FOREIGN KEY ("templateExerciseId") REFERENCES "WorkoutTemplateExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestingSession" ADD CONSTRAINT "TestingSession_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestingSession" ADD CONSTRAINT "TestingSession_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestingSession" ADD CONSTRAINT "TestingSession_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestingSessionActivity" ADD CONSTRAINT "TestingSessionActivity_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TestingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestingSessionActivity" ADD CONSTRAINT "TestingSessionActivity_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestingSessionStudent" ADD CONSTRAINT "TestingSessionStudent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TestingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestingSessionStudent" ADD CONSTRAINT "TestingSessionStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceResult" ADD CONSTRAINT "PerformanceResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceResult" ADD CONSTRAINT "PerformanceResult_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceResult" ADD CONSTRAINT "PerformanceResult_testingSessionId_fkey" FOREIGN KEY ("testingSessionId") REFERENCES "TestingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceResult" ADD CONSTRAINT "PerformanceResult_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceResult" ADD CONSTRAINT "PerformanceResult_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceResult" ADD CONSTRAINT "PerformanceResult_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenchmarkValue" ADD CONSTRAINT "BenchmarkValue_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "BenchmarkDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenchmarkValue" ADD CONSTRAINT "BenchmarkValue_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAchievement" ADD CONSTRAINT "StudentAchievement_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAchievement" ADD CONSTRAINT "StudentAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGamification" ADD CONSTRAINT "StudentGamification_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpTransaction" ADD CONSTRAINT "XpTransaction_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAccolade" ADD CONSTRAINT "StudentAccolade_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAccolade" ADD CONSTRAINT "StudentAccolade_accoladeId_fkey" FOREIGN KEY ("accoladeId") REFERENCES "AccoladeDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DynamicAccoladeHolder" ADD CONSTRAINT "DynamicAccoladeHolder_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

