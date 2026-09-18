import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { KPI_METRIC_META } from "@/lib/kpi-targets";
import { classSectionLabel, isGraduatingClassName } from "@/lib/periods";

export async function POST(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const dateStr = String(body.testingDate ?? "").trim();
  if (!dateStr) {
    return NextResponse.json(
      { error: "Test date is required so progress charts have a point in time" },
      { status: 400 }
    );
  }
  const testingDate = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(testingDate.getTime())) {
    return NextResponse.json({ error: "Invalid test date" }, { status: 400 });
  }

  const classId = body.classId ? String(body.classId) : "";
  if (!classId) {
    return NextResponse.json(
      { error: "Pick a class hour / section before starting a test" },
      { status: 400 }
    );
  }

  const schoolYear = await prisma.schoolYear.findFirst({
    where: { schoolId: session.schoolId, isCurrent: true },
  });
  if (!schoolYear) {
    return NextResponse.json({ error: "No current school year" }, { status: 400 });
  }

  const cls = await prisma.class.findFirst({
    where: { id: classId, schoolId: session.schoolId },
    include: { enrollments: true },
  });
  if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  if (isGraduatingClassName(cls.name)) {
    return NextResponse.json(
      { error: "Use a period / semester section, not a graduating class cohort" },
      { status: 400 }
    );
  }

  const dayStart = new Date(`${dateStr}T00:00:00`);
  const dayEnd = new Date(`${dateStr}T23:59:59.999`);
  const sameDayCount = await prisma.testingSession.count({
    where: {
      schoolId: session.schoolId,
      testingDate: { gte: dayStart, lte: dayEnd },
    },
  });

  let name = String(body.name ?? "").trim();
  if (!name) {
    name =
      sameDayCount === 0 ? "Performance Test" : `Performance Test (${sameDayCount + 1})`;
  } else if (sameDayCount > 0) {
    // If coach reuses the default base name, disambiguate.
    const base = name.replace(/\s*\(\d+\)\s*$/, "").trim();
    if (/^performance test$/i.test(base) || /^activities test$/i.test(base)) {
      name = `${base} (${sameDayCount + 1})`;
    }
  }

  const slugs: string[] =
    Array.isArray(body.activitySlugs) && body.activitySlugs.length > 0
      ? body.activitySlugs
      : KPI_METRIC_META.map((m) => m.slug);

  const activities = await prisma.activity.findMany({
    where: { slug: { in: slugs } },
  });

  const now = new Date();
  const rec = await prisma.testingSession.create({
    data: {
      schoolId: session.schoolId,
      schoolYearId: schoolYear.id,
      classId: cls.id,
      name,
      testingDate,
      gradeLevel: cls.gradeLevel,
      status: "LIVE",
      recordingUnlocked: true,
      liveOpenedAt: now,
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

  const studentIds = cls.enrollments.map((e) => e.studentId);
  if (studentIds.length > 0) {
    await prisma.testingSessionStudent.createMany({
      data: studentIds.map((studentId) => ({ sessionId: rec.id, studentId })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({
    id: rec.id,
    name,
    classLabel: classSectionLabel(cls),
  });
}
