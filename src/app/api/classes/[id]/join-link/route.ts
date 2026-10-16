import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { coachCanManageClass } from "@/lib/auth/coach-scope";
import { createSecureClassJoinLink, revokeClassJoinLink } from "@/lib/services/class-join-link";
import { writeAuditLog } from "@/lib/security/audit-log";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const cls = await prisma.class.findFirst({
    where: { id, schoolId: session.schoolId },
    select: { id: true },
  });
  if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  if (session.role === "COACH" && !(await coachCanManageClass(session, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const link = await createSecureClassJoinLink(cls.id, session.userId);
  await writeAuditLog({
    actorUserId: session.userId,
    actorRole: session.role,
    schoolId: session.schoolId,
    action: "CLASS_JOIN_LINK_CREATED",
    targetType: "Class",
    targetId: cls.id,
    metadata: { expiresAt: link.expiresAt.toISOString() },
  });

  return NextResponse.json({
    urlPath: link.urlPath,
    expiresAt: link.expiresAt.toISOString(),
    token: link.token,
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const cls = await prisma.class.findFirst({
    where: { id, schoolId: session.schoolId },
    select: { id: true },
  });
  if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  if (session.role === "COACH" && !(await coachCanManageClass(session, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }
  const revoked = await revokeClassJoinLink(token);
  await writeAuditLog({
    actorUserId: session.userId,
    actorRole: session.role,
    schoolId: session.schoolId,
    action: "CLASS_JOIN_LINK_REVOKED",
    targetType: "Class",
    targetId: cls.id,
    outcome: revoked ? "SUCCESS" : "FAILURE",
  });
  return NextResponse.json({ ok: revoked });
}
