import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { KPI_METRIC_META } from "@/lib/kpi-targets";

export async function POST(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const dateStr = String(body.testingDate ?? "").trim();
  if (!name) return NextResponse.json({ error: "Session name is required" }, { status: 400 });
  if (!dateStr) {
    return NextResponse.json({ error: "Test date is required so progress charts have a point in time" }, { status: 400 });
  }
  const testingDate = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(testingDate.getTime())) {
    return NextResponse.json({ error: "Invalid test date" }, { status: 400 });
  }

  const schoolYear = await prisma.schoolYear.findFirst({
    where: { schoolId: session.schoolId, isCurrent: true },
  });
  if (!schoolYear) {
    return NextResponse.json({ error: "No current school year" }, { status: 400 });
  }

  const classId = body.classId ? String(body.classId) : null;
  let gradeLevel: number | null = null;
  let studentIds: string[] = [];
  if (classId) {
    const cls = await prisma.class.findFirst({
      where: { id: classId, schoolId: session.schoolId },
      include: { enrollments: true },
    });
    if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });
    gradeLevel = cls.gradeLevel;
    studentIds = cls.enrollments.map((e) => e.studentId);
  }

  const slugs: string[] = Array.isArray(body.activitySlugs) && body.activitySlugs.length > 0
    ? body.activitySlugs
    : KPI_METRIC_META.map((m) => m.slug);

  const activities = await prisma.activity.findMany({
    where: { slug: { in: slugs } },
  });

  const rec = await prisma.testingSession.create({
    data: {
      schoolId: session.schoolId,
      schoolYearId: schoolYear.id,
      classId,
      name,
      testingDate,
      gradeLevel,
      status: "DRAFT",
      createdById: session.userId,
    },
  });

  await prisma.testingSessionActivity.createMany({
    data: activities.map((a, i) => ({
      sessionId: rec.id,
      activityId: a.id,
      sortOrder: i,
    })),
  });

  if (studentIds.length > 0) {
    await prisma.testingSessionStudent.createMany({
      data: studentIds.map((studentId) => ({ sessionId: rec.id, studentId })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ id: rec.id });
}
