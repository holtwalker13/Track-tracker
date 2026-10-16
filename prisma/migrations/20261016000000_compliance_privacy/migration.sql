-- Compliance & privacy hardening (FERPA/COPPA foundations)

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "disabledAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "SchoolPrivacySettings" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "leaderboardsEnabledForStudents" BOOLEAN NOT NULL DEFAULT true,
    "peerLeaderboardsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "studentLeaderboardDisplayMode" TEXT NOT NULL DEFAULT 'PSEUDONYM',
    "dataRetentionYears" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" TEXT,

    CONSTRAINT "SchoolPrivacySettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SchoolPrivacySettings_schoolId_key" ON "SchoolPrivacySettings"("schoolId");

ALTER TABLE "SchoolPrivacySettings" ADD CONSTRAINT "SchoolPrivacySettings_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "SchoolAuthorization" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "authorizingOfficialName" TEXT NOT NULL,
    "authorizingOfficialRole" TEXT NOT NULL,
    "authorizationDate" TIMESTAMP(3),
    "privacyNoticeVersion" TEXT,
    "agreementVersion" TEXT,
    "authorizedPurposes" TEXT,
    "studentGroupsScope" TEXT,
    "thirdPartyDisclosure" TEXT,
    "evidenceNote" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,

    CONSTRAINT "SchoolAuthorization_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SchoolAuthorization_schoolId_status_idx" ON "SchoolAuthorization"("schoolId", "status");
CREATE INDEX IF NOT EXISTS "SchoolAuthorization_organizationId_idx" ON "SchoolAuthorization"("organizationId");

ALTER TABLE "SchoolAuthorization" ADD CONSTRAINT "SchoolAuthorization_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ClassJoinLink" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassJoinLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClassJoinLink_tokenHash_key" ON "ClassJoinLink"("tokenHash");
CREATE INDEX IF NOT EXISTS "ClassJoinLink_classId_idx" ON "ClassJoinLink"("classId");
CREATE INDEX IF NOT EXISTS "ClassJoinLink_expiresAt_idx" ON "ClassJoinLink"("expiresAt");

ALTER TABLE "ClassJoinLink" ADD CONSTRAINT "ClassJoinLink_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "SecurityAuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "schoolId" TEXT,
    "districtId" TEXT,
    "actorUserId" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "outcome" TEXT NOT NULL DEFAULT 'SUCCESS',
    "correlationId" TEXT,
    "ipHint" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SecurityAuditLog_schoolId_createdAt_idx" ON "SecurityAuditLog"("schoolId", "createdAt");
CREATE INDEX IF NOT EXISTS "SecurityAuditLog_actorUserId_createdAt_idx" ON "SecurityAuditLog"("actorUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "SecurityAuditLog_action_createdAt_idx" ON "SecurityAuditLog"("action", "createdAt");

CREATE TABLE IF NOT EXISTS "PrivacyDataRequest" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT,
    "requestType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "requestedByUserId" TEXT NOT NULL,
    "notes" TEXT,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "PrivacyDataRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PrivacyDataRequest_schoolId_status_idx" ON "PrivacyDataRequest"("schoolId", "status");
CREATE INDEX IF NOT EXISTS "PrivacyDataRequest_studentId_idx" ON "PrivacyDataRequest"("studentId");

ALTER TABLE "PrivacyDataRequest" ADD CONSTRAINT "PrivacyDataRequest_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
