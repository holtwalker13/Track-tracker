import { prisma } from "@/lib/db";

export type SchoolPrivacySnapshot = {
  leaderboardsEnabledForStudents: boolean;
  peerLeaderboardsEnabled: boolean;
  studentLeaderboardDisplayMode: "PSEUDONYM" | "LEGAL_NAME";
  dataRetentionYears: number | null;
  activeAuthorization: {
    id: string;
    status: string;
    authorizingOfficialName: string;
    authorizationDate: Date | null;
    privacyNoticeVersion: string | null;
    agreementVersion: string | null;
  } | null;
};

const defaults: Omit<SchoolPrivacySnapshot, "activeAuthorization"> = {
  leaderboardsEnabledForStudents: true,
  peerLeaderboardsEnabled: true,
  studentLeaderboardDisplayMode: "PSEUDONYM",
  dataRetentionYears: null,
};

export async function getSchoolPrivacySnapshot(schoolId: string): Promise<SchoolPrivacySnapshot> {
  const [settings, auth] = await Promise.all([
    prisma.schoolPrivacySettings.findUnique({ where: { schoolId } }),
    prisma.schoolAuthorization.findFirst({
      where: { schoolId, status: "ACTIVE", revokedAt: null },
      orderBy: { authorizationDate: "desc" },
      select: {
        id: true,
        status: true,
        authorizingOfficialName: true,
        authorizationDate: true,
        privacyNoticeVersion: true,
        agreementVersion: true,
      },
    }),
  ]);

  return {
    ...defaults,
    leaderboardsEnabledForStudents: settings?.leaderboardsEnabledForStudents ?? defaults.leaderboardsEnabledForStudents,
    peerLeaderboardsEnabled: settings?.peerLeaderboardsEnabled ?? defaults.peerLeaderboardsEnabled,
    studentLeaderboardDisplayMode:
      settings?.studentLeaderboardDisplayMode === "LEGAL_NAME" ? "LEGAL_NAME" : "PSEUDONYM",
    dataRetentionYears: settings?.dataRetentionYears ?? null,
    activeAuthorization: auth,
  };
}

export async function upsertSchoolPrivacySettings(
  schoolId: string,
  userId: string,
  input: Partial<{
    leaderboardsEnabledForStudents: boolean;
    peerLeaderboardsEnabled: boolean;
    studentLeaderboardDisplayMode: "PSEUDONYM" | "LEGAL_NAME";
    dataRetentionYears: number | null;
  }>
) {
  return prisma.schoolPrivacySettings.upsert({
    where: { schoolId },
    create: {
      schoolId,
      updatedByUserId: userId,
      leaderboardsEnabledForStudents: input.leaderboardsEnabledForStudents ?? true,
      peerLeaderboardsEnabled: input.peerLeaderboardsEnabled ?? true,
      studentLeaderboardDisplayMode: input.studentLeaderboardDisplayMode ?? "PSEUDONYM",
      dataRetentionYears: input.dataRetentionYears ?? undefined,
    },
    update: {
      updatedByUserId: userId,
      ...(input.leaderboardsEnabledForStudents !== undefined
        ? { leaderboardsEnabledForStudents: input.leaderboardsEnabledForStudents }
        : {}),
      ...(input.peerLeaderboardsEnabled !== undefined
        ? { peerLeaderboardsEnabled: input.peerLeaderboardsEnabled }
        : {}),
      ...(input.studentLeaderboardDisplayMode !== undefined
        ? { studentLeaderboardDisplayMode: input.studentLeaderboardDisplayMode }
        : {}),
      ...(input.dataRetentionYears !== undefined ? { dataRetentionYears: input.dataRetentionYears } : {}),
    },
  });
}
