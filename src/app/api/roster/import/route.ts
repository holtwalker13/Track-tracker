import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { headerIndex, parseCsv } from "@/lib/csv";
import { DEFAULT_CLASS_YEAR, isClassYear } from "@/lib/grades";
import { genderFromFirstName } from "@/lib/gender";
import { ensureStudentLoginUser } from "@/lib/services/student-login";

function parseGender(raw: string | undefined, firstName: string, index: number): "M" | "F" {
  const v = (raw ?? "").trim().toLowerCase();
  if (["m", "male", "boy", "boys", "b", "man"].includes(v)) return "M";
  if (["f", "female", "girl", "girls", "g", "w", "woman"].includes(v)) return "F";
  return genderFromFirstName(firstName, index);
}

function parseYear(raw: string | undefined): number {
  const n = parseInt((raw ?? "").trim(), 10);
  if (n === 2038) return 2028;
  if (isClassYear(n)) return n;
  return DEFAULT_CLASS_YEAR;
}

export async function POST(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload a CSV file" }, { status: 400 });
  }
  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return NextResponse.json({ error: "CSV needs a header and at least one row" }, { status: 400 });
  }

  const header = rows[0]!;
  const firstIdx = headerIndex(header, ["firstName", "first", "firstname"]);
  const lastIdx = headerIndex(header, ["lastName", "last", "lastname"]);
  const nameIdx = headerIndex(header, ["name", "student", "athlete"]);
  if (firstIdx < 0 && lastIdx < 0 && nameIdx < 0) {
    return NextResponse.json(
      {
        error:
          "CSV needs firstName and lastName columns (or a single name column), plus optional gender, classYear, studentNumber, className, period.",
      },
      { status: 400 }
    );
  }

  const genderIdx = headerIndex(header, ["gender", "sex"]);
  const yearIdx = headerIndex(header, ["classYear", "grade", "graduatingclass", "classof"]);
  const numIdx = headerIndex(header, ["studentNumber", "id", "number", "studentid"]);
  const classIdx = headerIndex(header, ["className", "classname", "classhour", "course", "section"]);
  const periodIdx = headerIndex(header, ["period"]);
  const sportsIdx = headerIndex(header, ["sports", "sport"]);

  const schoolYear = await prisma.schoolYear.findFirst({
    where: { schoolId: session.schoolId, isCurrent: true },
  });
  if (!schoolYear) {
    return NextResponse.json({ error: "No current school year" }, { status: 400 });
  }

  const coach = await prisma.coachProfile.findFirst({
    where: { userId: session.userId, schoolId: session.schoolId },
  });

  const school = await prisma.school.findUniqueOrThrow({
    where: { id: session.schoolId },
    select: { slug: true },
  });

  const existing = await prisma.studentProfile.findMany({
    where: { schoolId: session.schoolId },
    select: { studentNumber: true },
  });
  let nextNum = 0;
  for (const row of existing) {
    const n = parseInt(row.studentNumber.replace(/\D/g, ""), 10);
    if (Number.isFinite(n) && n > nextNum) nextNum = n;
  }

  let createdStudents = 0;
  let existingStudents = 0;
  let enrolled = 0;
  const classCache = new Map<string, string>();

  for (const [i, row] of rows.slice(1).entries()) {
    let first = firstIdx >= 0 ? (row[firstIdx] ?? "").trim() : "";
    let last = lastIdx >= 0 ? (row[lastIdx] ?? "").trim() : "";
    if ((!first || !last) && nameIdx >= 0) {
      const parts = (row[nameIdx] ?? "").trim().split(/\s+/);
      if (parts.length === 1) {
        first = first || parts[0]!;
        last = last || "Athlete";
      } else if (parts.length > 1) {
        first = first || parts[0]!;
        last = last || parts.slice(1).join(" ");
      }
    }
    if (!first || !last) continue;

    const gender = parseGender(genderIdx >= 0 ? row[genderIdx] : undefined, first, i);
    const classYear = parseYear(yearIdx >= 0 ? row[yearIdx] : undefined);
    const sports = sportsIdx >= 0 ? (row[sportsIdx] ?? "").trim() || null : null;
    let studentNumber = numIdx >= 0 ? (row[numIdx] ?? "").trim().toUpperCase() : "";

    let student = null;
    if (studentNumber) {
      student = await prisma.studentProfile.findFirst({
        where: { schoolId: session.schoolId, studentNumber },
        select: {
          id: true,
          studentNumber: true,
          firstName: true,
          lastName: true,
          userId: true,
        },
      });
    }
    if (!student) {
      student = await prisma.studentProfile.findFirst({
        where: {
          schoolId: session.schoolId,
          firstName: { equals: first, mode: "insensitive" },
          lastName: { equals: last, mode: "insensitive" },
        },
        select: {
          id: true,
          studentNumber: true,
          firstName: true,
          lastName: true,
          userId: true,
        },
      });
    }

    if (!student) {
      if (!studentNumber) {
        nextNum += 1;
        studentNumber = `S${String(nextNum).padStart(4, "0")}`;
      }
      const clash = await prisma.studentProfile.findFirst({
        where: { schoolId: session.schoolId, studentNumber },
      });
      if (clash) {
        nextNum += 1;
        studentNumber = `S${String(nextNum).padStart(4, "0")}`;
      }
      student = await prisma.studentProfile.create({
        data: {
          schoolId: session.schoolId,
          studentNumber,
          firstName: first,
          lastName: last,
          dateOfBirth: new Date(2010, 0, 1),
          gender,
          sports,
          participationType: sports && !/^pe\b/i.test(sports) ? "ATHLETE" : "PE",
          anonymousId: `import-${studentNumber.toLowerCase()}`,
          enrollments: {
            create: { schoolYearId: schoolYear.id, gradeLevel: classYear },
          },
        },
      });
      await ensureStudentLoginUser(
        {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          userId: student.userId,
        },
        session.schoolId,
        school.slug
      );
      createdStudents += 1;
    } else {
      existingStudents += 1;
      if (!student.userId) {
        await ensureStudentLoginUser(
          {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            userId: student.userId,
          },
          session.schoolId,
          school.slug
        );
      }
      await prisma.studentEnrollment.upsert({
        where: {
          studentId_schoolYearId: { studentId: student.id, schoolYearId: schoolYear.id },
        },
        create: { studentId: student.id, schoolYearId: schoolYear.id, gradeLevel: classYear },
        update: { gradeLevel: classYear },
      });
    }

    const className = classIdx >= 0 ? (row[classIdx] ?? "").trim() : "";
    if (!className) continue;
    const period = periodIdx >= 0 ? (row[periodIdx] ?? "").trim() || null : null;
    const cacheKey = `${className}::${period ?? ""}`;
    let classId = classCache.get(cacheKey);
    if (!classId) {
      const found = await prisma.class.findFirst({
        where: { schoolId: session.schoolId, name: className, ...(period ? { period } : {}) },
      });
      const rec =
        found ??
        (await prisma.class.create({
          data: {
            schoolId: session.schoolId,
            coachId: coach?.id,
            name: className,
            period,
          },
        }));
      classId = rec.id;
      classCache.set(cacheKey, classId);
    }

    await prisma.classEnrollment.upsert({
      where: { classId_studentId: { classId, studentId: student.id } },
      create: { classId, studentId: student.id },
      update: {},
    });
    enrolled += 1;
  }

  return NextResponse.json({
    ok: true,
    createdStudents,
    existingStudents,
    classes: classCache.size,
    enrolled,
  });
}
