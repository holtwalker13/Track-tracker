import { NextResponse } from "next/server";
import { requireSession, replaceSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { clientIpHint, writeAuditLog } from "@/lib/security/audit-log";

export async function POST(request: Request) {
  const session = await requireSession(["ADMIN"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ip = clientIpHint(request);

  const body = await request.json().catch(() => ({}));
  const schoolId = typeof body.schoolId === "string" ? body.schoolId : "";
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  if (!schoolId) {
    await replaceSession({ userId: session.userId, role: "ADMIN" });
    await writeAuditLog({
      actorUserId: session.userId,
      actorRole: "ADMIN",
      action: "ADMIN_SCHOOL_CONTEXT_CLEAR",
      outcome: "SUCCESS",
      ipHint: ip,
      metadata: reason ? { reason } : undefined,
    });
    return NextResponse.json({ ok: true, schoolId: null });
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) {
    return NextResponse.json({ error: "School not found" }, { status: 404 });
  }

  await replaceSession({
    userId: session.userId,
    role: "ADMIN",
    schoolId: school.id,
  });

  await writeAuditLog({
    actorUserId: session.userId,
    actorRole: "ADMIN",
    organizationId: school.organizationId,
    schoolId: school.id,
    action: "ADMIN_SCHOOL_CONTEXT_SET",
    targetType: "School",
    targetId: school.id,
    outcome: "SUCCESS",
    ipHint: ip,
    metadata: reason ? { reason } : undefined,
  });

  return NextResponse.json({ ok: true, schoolId: school.id, name: school.name });
}
