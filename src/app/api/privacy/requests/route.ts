import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/security/audit-log";

const TYPES = new Set(["ACCESS", "EXPORT", "CORRECTION", "DELETION"]);

export async function GET() {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await prisma.privacyDataRequest.findMany({
    where: { schoolId: session.schoolId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ requests: rows });
}

export async function POST(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const requestType = String(body.requestType ?? "").toUpperCase();
  if (!TYPES.has(requestType)) {
    return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
  }
  const studentId = body.studentId ? String(body.studentId) : null;
  if (studentId) {
    const student = await prisma.studentProfile.findFirst({
      where: { id: studentId, schoolId: session.schoolId },
      select: { id: true },
    });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const row = await prisma.privacyDataRequest.create({
    data: {
      schoolId: session.schoolId,
      studentId: studentId ?? undefined,
      requestType,
      requestedByUserId: session.userId,
      notes: body.notes ? String(body.notes).slice(0, 2000) : undefined,
    },
  });

  await writeAuditLog({
    actorUserId: session.userId,
    actorRole: session.role,
    schoolId: session.schoolId,
    action: "PRIVACY_REQUEST_CREATED",
    targetType: "PrivacyDataRequest",
    targetId: row.id,
    metadata: { requestType, studentId },
  });

  return NextResponse.json({ request: row });
}
