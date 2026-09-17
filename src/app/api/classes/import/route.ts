import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(",").map((c) => c.trim().replace(/^"|"$/g, "")))
    .filter((row) => row.some((c) => c.length > 0));
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

  const header = rows[0]!.map((h) => h.toLowerCase().replace(/\s+/g, ""));
  const classIdx = header.findIndex((h) => h === "classname" || h === "class");
  const numIdx = header.findIndex((h) => h === "studentnumber" || h === "id" || h === "number");
  const firstIdx = header.findIndex((h) => h === "firstname" || h === "first");
  const lastIdx = header.findIndex((h) => h === "lastname" || h === "last");
  const periodIdx = header.findIndex((h) => h === "period");
  if (classIdx < 0) {
    return NextResponse.json(
      { error: "CSV needs a className column. Optional: period, studentNumber, firstName, lastName." },
      { status: 400 }
    );
  }

  const coach = await prisma.coachProfile.findFirst({
    where: { userId: session.userId, schoolId: session.schoolId },
  });

  let enrolled = 0;
  const classCache = new Map<string, string>();

  for (const row of rows.slice(1)) {
    const className = row[classIdx]?.trim();
    if (!className) continue;
    const period = periodIdx >= 0 ? row[periodIdx]?.trim() || null : null;
    const cacheKey = `${className}::${period ?? ""}`;
    let classId = classCache.get(cacheKey);
    if (!classId) {
      const existing = await prisma.class.findFirst({
        where: { schoolId: session.schoolId, name: className, ...(period ? { period } : {}) },
      });
      const rec =
        existing ??
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

    let student = null;
    const number = numIdx >= 0 ? row[numIdx]?.trim() : "";
    if (number) {
      student = await prisma.studentProfile.findFirst({
        where: { schoolId: session.schoolId, studentNumber: number },
      });
    }
    if (!student && firstIdx >= 0 && lastIdx >= 0) {
      const first = row[firstIdx]?.trim();
      const last = row[lastIdx]?.trim();
      if (first && last) {
        student = await prisma.studentProfile.findFirst({
          where: {
            schoolId: session.schoolId,
            firstName: { equals: first, mode: "insensitive" },
            lastName: { equals: last, mode: "insensitive" },
          },
        });
      }
    }
    if (!student) continue;
    await prisma.classEnrollment.upsert({
      where: { classId_studentId: { classId, studentId: student.id } },
      create: { classId, studentId: student.id },
      update: {},
    });
    enrolled += 1;
  }

  return NextResponse.json({ ok: true, classes: classCache.size, enrolled });
}
