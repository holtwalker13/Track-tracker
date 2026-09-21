import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isClassYear } from "@/lib/grades";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
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

  await prisma.studentProfile.update({ where: { id }, data });

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
