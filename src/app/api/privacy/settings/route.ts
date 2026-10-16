import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getSchoolPrivacySnapshot, upsertSchoolPrivacySettings } from "@/lib/queries/school-privacy";
import { writeAuditLog } from "@/lib/security/audit-log";

export async function GET() {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const snapshot = await getSchoolPrivacySnapshot(session.schoolId);
  return NextResponse.json(snapshot);
}

export async function PATCH(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const updated = await upsertSchoolPrivacySettings(session.schoolId, session.userId, {
    leaderboardsEnabledForStudents:
      body.leaderboardsEnabledForStudents !== undefined
        ? Boolean(body.leaderboardsEnabledForStudents)
        : undefined,
    peerLeaderboardsEnabled:
      body.peerLeaderboardsEnabled !== undefined ? Boolean(body.peerLeaderboardsEnabled) : undefined,
    studentLeaderboardDisplayMode:
      body.studentLeaderboardDisplayMode === "LEGAL_NAME" ? "LEGAL_NAME" : body.studentLeaderboardDisplayMode === "PSEUDONYM" ? "PSEUDONYM" : undefined,
    dataRetentionYears:
      body.dataRetentionYears === null
        ? null
        : body.dataRetentionYears !== undefined
          ? Number(body.dataRetentionYears)
          : undefined,
  });
  await writeAuditLog({
    actorUserId: session.userId,
    actorRole: session.role,
    schoolId: session.schoolId,
    action: "PRIVACY_SETTINGS_UPDATE",
    targetType: "SchoolPrivacySettings",
    targetId: updated.id,
  });
  const snapshot = await getSchoolPrivacySnapshot(session.schoolId);
  return NextResponse.json(snapshot);
}
