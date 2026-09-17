import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isClassYear } from "@/lib/grades";

export async function POST(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const studentNumber = String(body.studentNumber ?? "").trim().toUpperCase();
  const gender = String(body.gender ?? "F").toUpperCase() === "M" ? "M" : "F";
  const classYear = Number(body.classYear);
  const sportsRaw = body.sports == null ? null : String(body.sports).trim();
  const sports = sportsRaw ? sportsRaw : null;
  const participationTypeRaw = String(body.participationType ?? "").toUpperCase();
  const participationType =
    participationTypeRaw === "PE" || participationTypeRaw === "ATHLETE"
      ? participationTypeRaw
      : null;
  const classId = body.classId ? String(body.classId) : null;

  if (!firstName || !lastName || !studentNumber) {
    return NextResponse.json({ error: "Name and student ID are required" }, { status: 400 });
  }
  if (!isClassYear(classYear)) {
    return NextResponse.json({ error: "Invalid graduating class" }, { status: 400 });
  }

  const schoolYear = await prisma.schoolYear.findFirst({
    where: { schoolId: session.schoolId, isCurrent: true },
  });
  if (!schoolYear) {
    return NextResponse.json({ error: "No current school year" }, { status: 400 });
  }

  const existing = await prisma.studentProfile.findFirst({
    where: { schoolId: session.schoolId, studentNumber },
  });
  if (existing) {
    return NextResponse.json({ error: "Student ID already exists" }, { status: 409 });
  }

  if (classId) {
    const cls = await prisma.class.findFirst({
      where: { id: classId, schoolId: session.schoolId },
    });
    if (!cls) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }
  }

  const student = await prisma.studentProfile.create({
    data: {
      schoolId: session.schoolId,
      studentNumber,
      firstName,
      lastName,
      dateOfBirth: new Date(2010, 0, 1),
      gender,
      sports,
      participationType,
      anonymousId: `manual-${studentNumber.toLowerCase()}`,
      enrollments: {
        create: {
          schoolYearId: schoolYear.id,
          gradeLevel: classYear,
        },
      },
      ...(classId
        ? {
            classEnrollments: {
              create: { classId },
            },
          }
        : {}),
    },
  });

  return NextResponse.json({ ok: true, studentId: student.id });
}
