import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isClassYear } from "@/lib/grades";
import { buildStudentUsernameBase, pickUniqueUsername } from "@/lib/services/student-username";
import { coachAssignedClassIds, ensureUnder13CollectionAllowed } from "@/lib/auth/tenant-access";

export async function GET(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const officialOnly = new URL(request.url).searchParams.get("official") === "1";
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length < 1) return NextResponse.json({ students: [] });

  let classScopeFilter: { classEnrollments: { some: { classId: { in: string[] } } } } | undefined;
  if (session.role === "COACH") {
    const profile = await prisma.coachProfile.findFirst({
      where: { userId: session.userId, schoolId: session.schoolId },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ students: [] });
    const classIds = [...(await coachAssignedClassIds(profile.id, session.schoolId))];
    if (classIds.length === 0) return NextResponse.json({ students: [] });
    classScopeFilter = { classEnrollments: { some: { classId: { in: classIds } } } };
  }

  const students = await prisma.studentProfile.findMany({
    where: {
      schoolId: session.schoolId,
      ...(officialOnly ? { provisional: false } : {}),
      ...(classScopeFilter ?? {}),
      AND: tokens.map((token) => ({
        OR: [
          { firstName: { contains: token, mode: "insensitive" as const } },
          { lastName: { contains: token, mode: "insensitive" as const } },
          { studentNumber: { contains: token, mode: "insensitive" as const } },
        ],
      })),
    },
    select: { id: true, firstName: true, lastName: true, studentNumber: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 12,
  });
  return NextResponse.json({ students });
}

export async function POST(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  let studentNumber = String(body.studentNumber ?? "").trim().toUpperCase();
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

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "First and last name are required" }, { status: 400 });
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

  if (!studentNumber) {
    // Auto-assign next school ID: S0001, S0002, …
    const existing = await prisma.studentProfile.findMany({
      where: { schoolId: session.schoolId, studentNumber: { startsWith: "S" } },
      select: { studentNumber: true },
    });
    let max = 0;
    for (const row of existing) {
      const n = parseInt(row.studentNumber.slice(1), 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
    studentNumber = `S${String(max + 1).padStart(4, "0")}`;
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

  const dob = body.dateOfBirth ? new Date(String(body.dateOfBirth)) : new Date(2010, 0, 1);
  const coppa = await ensureUnder13CollectionAllowed(session.schoolId, dob);
  if (!coppa.ok) {
    return NextResponse.json({ error: coppa.error }, { status: 403 });
  }

  const username = await pickUniqueUsername(
    session.schoolId,
    buildStudentUsernameBase(firstName, lastName, classYear)
  );

  const student = await prisma.studentProfile.create({
    data: {
      schoolId: session.schoolId,
      studentNumber,
      username,
      firstName,
      lastName,
      dateOfBirth: dob,
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
