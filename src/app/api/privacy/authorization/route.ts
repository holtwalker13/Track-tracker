import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/security/audit-log";

export async function GET() {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await prisma.schoolAuthorization.findMany({
    where: { schoolId: session.schoolId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ authorizations: rows });
}

export async function POST(request: Request) {
  const session = await requireSession(["ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "School context required" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const school = await prisma.school.findUnique({
    where: { id: session.schoolId },
    select: { id: true, organizationId: true },
  });
  if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

  const authorizingOfficialName = String(body.authorizingOfficialName ?? "").trim();
  const authorizingOfficialRole = String(body.authorizingOfficialRole ?? "").trim();
  if (!authorizingOfficialName || !authorizingOfficialRole) {
    return NextResponse.json({ error: "Official name and role are required" }, { status: 400 });
  }

  const status = body.status === "ACTIVE" ? "ACTIVE" : "PENDING";
  const row = await prisma.schoolAuthorization.create({
    data: {
      schoolId: school.id,
      organizationId: school.organizationId,
      status,
      authorizingOfficialName,
      authorizingOfficialRole,
      authorizationDate: status === "ACTIVE" ? new Date() : undefined,
      privacyNoticeVersion: body.privacyNoticeVersion ? String(body.privacyNoticeVersion) : undefined,
      agreementVersion: body.agreementVersion ? String(body.agreementVersion) : undefined,
      authorizedPurposes: body.authorizedPurposes ? String(body.authorizedPurposes) : undefined,
      studentGroupsScope: body.studentGroupsScope ? String(body.studentGroupsScope) : undefined,
      thirdPartyDisclosure: body.thirdPartyDisclosure ? String(body.thirdPartyDisclosure) : undefined,
      evidenceNote: body.evidenceNote ? String(body.evidenceNote) : undefined,
      createdByUserId: session.userId,
    },
  });

  await writeAuditLog({
    actorUserId: session.userId,
    actorRole: session.role,
    organizationId: school.organizationId,
    schoolId: school.id,
    action: "SCHOOL_AUTHORIZATION_CREATED",
    targetType: "SchoolAuthorization",
    targetId: row.id,
    metadata: { status },
  });

  return NextResponse.json({ authorization: row });
}
