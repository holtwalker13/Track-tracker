import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isClassYear } from "@/lib/grades";
import { assertCoachOrAdminStudentAccess } from "@/lib/auth/tenant-access";
import { writeAuditLog } from "@/lib/security/audit-log";
import { normalizeLoginEmail } from "@/lib/school-login-email";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const access = await assertCoachOrAdminStudentAccess(session, id);
  if (!access.ok) {
    return NextResponse.json({ error: access.status === 404 ? "Not found" : "Forbidden" }, { status: access.status });
  }
  const student = await prisma.studentProfile.findUnique({ where: { id } });
  if (!student || student.schoolId !== session.schoolId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const data: {
    sports?: string | null;
    participationType?: string | null;
    firstName?: string;
    lastName?: string;
    nameHidden?: boolean;
    username?: string | null;
    rosterEmail?: string | null;
  } = {};

  if ("sports" in body) {
    const sports = body.sports == null ? null : String(body.sports).trim();
    data.sports = sports || null;
  }
  if ("participationType" in body) {
    const raw = String(body.participationType ?? "").toUpperCase();
    data.participationType = raw === "PE" || raw === "ATHLETE" ? raw : null;
  }
  if ("nameHidden" in body) {
    data.nameHidden = Boolean(body.nameHidden);
  }
  if (body.firstName) data.firstName = String(body.firstName).trim();
  if (body.lastName) data.lastName = String(body.lastName).trim();
  if ("username" in body) {
    const raw = body.username == null ? "" : String(body.username).trim().toLowerCase();
    if (!raw) {
      return NextResponse.json({ error: "Username cannot be empty" }, { status: 400 });
    }
    if (!/^[a-z0-9]{3,32}$/.test(raw)) {
      return NextResponse.json(
        { error: "Username must be 3–32 letters or numbers (no spaces)" },
        { status: 400 }
      );
    }
    const taken = await prisma.studentProfile.findFirst({
      where: { schoolId: session.schoolId, username: raw, id: { not: id } },
    });
    if (taken) {
      return NextResponse.json({ error: "Username already in use at this school" }, { status: 409 });
    }
    data.username = raw;
  }
  if ("rosterEmail" in body) {
    const raw = body.rosterEmail == null ? "" : String(body.rosterEmail).trim();
    if (!raw) {
      data.rosterEmail = null;
    } else {
      const email = normalizeLoginEmail(raw);
      if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
        return NextResponse.json({ error: "Enter a full email address." }, { status: 400 });
      }
      const taken = await prisma.studentProfile.findFirst({
        where: { schoolId: session.schoolId, rosterEmail: email, id: { not: id } },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json({ error: "That email is already on another student." }, { status: 409 });
      }
      data.rosterEmail = email;
    }
  }

  await prisma.studentProfile.update({ where: { id }, data });
  await writeAuditLog({
    actorUserId: session.userId,
    actorRole: session.role,
    schoolId: session.schoolId,
    action: "STUDENT_RECORD_UPDATE",
    targetType: "StudentProfile",
    targetId: id,
    metadata: { fields: Object.keys(data) },
  });

  if (body.classYear != null) {
    const classYear = Number(body.classYear);
    if (!isClassYear(classYear)) {
      return NextResponse.json({ error: "Invalid graduating class" }, { status: 400 });
    }
    const schoolYear = await prisma.schoolYear.findFirst({
      where: { schoolId: session.schoolId, isCurrent: true },
    });
    if (schoolYear) {
      await prisma.studentEnrollment.upsert({
        where: {
          studentId_schoolYearId: { studentId: id, schoolYearId: schoolYear.id },
        },
        create: { studentId: id, schoolYearId: schoolYear.id, gradeLevel: classYear },
        update: { gradeLevel: classYear },
      });
    }
  }

  if ("classId" in body) {
    const classId = body.classId ? String(body.classId) : null;
    if (classId) {
      const cls = await prisma.class.findFirst({
        where: { id: classId, schoolId: session.schoolId },
      });
      if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });
      await prisma.classEnrollment.createMany({
        data: [{ classId, studentId: id }],
        skipDuplicates: true,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
