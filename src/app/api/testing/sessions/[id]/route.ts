import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isWithinLiveWindow } from "@/lib/constants";
import { coachCanAdministerTestingSession } from "@/lib/auth/coach-scope";
import { calendarDateAtNoonUtc } from "@/lib/calendar-date";
import { deleteTestingSessionAndMarks } from "@/lib/services/results";
import { recordPerformanceAudits } from "@/lib/services/performance-audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const rec = await prisma.testingSession.findFirst({
    where: { id, schoolId: session.schoolId, archivedAt: null },
  });
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();

  if (!(await coachCanAdministerTestingSession(session, id))) {
    return NextResponse.json({ error: "Not allowed for this session" }, { status: 403 });
  }

  // Live controls: pause / resume / close / lock recording
  if (body.action) {
    const action = String(body.action);
    if (action === "close") {
      await prisma.testingSession.update({
        where: { id },
        data: { status: "CLOSED", recordingUnlocked: true },
      });
      return NextResponse.json({ ok: true, status: "CLOSED" });
    }
    if (action === "resume") {
      if (!isWithinLiveWindow(rec.liveOpenedAt)) {
        return NextResponse.json(
          { error: "Live window (24h) expired — start a new session" },
          { status: 400 }
        );
      }
      await prisma.testingSession.update({
        where: { id },
        data: {
          status: "LIVE",
          recordingUnlocked: true,
          liveOpenedAt: rec.liveOpenedAt ?? new Date(),
        },
      });
      return NextResponse.json({ ok: true, status: "LIVE" });
    }
    if (action === "lock") {
      await prisma.testingSession.update({
        where: { id },
        data: { recordingUnlocked: false },
      });
      return NextResponse.json({ ok: true, recordingUnlocked: false });
    }
    if (action === "reopen") {
      await prisma.testingSession.update({
        where: { id },
        data: {
          status: "LIVE",
          recordingUnlocked: true,
          liveOpenedAt: new Date(),
        },
      });
      return NextResponse.json({ ok: true, status: "LIVE" });
    }
    if (action === "unlock") {
      if (rec.status === "CLOSED" || rec.status === "COMPLETED") {
        return NextResponse.json({ error: "Session is closed" }, { status: 400 });
      }
      if (!isWithinLiveWindow(rec.liveOpenedAt)) {
        return NextResponse.json({ error: "Live window (24h) expired" }, { status: 400 });
      }
      await prisma.testingSession.update({
        where: { id },
        data: { recordingUnlocked: true, status: rec.status === "PAUSED" ? "LIVE" : rec.status },
      });
      return NextResponse.json({ ok: true, recordingUnlocked: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  if (body.attemptSlots != null) {
    const n = Math.max(1, Math.min(12, Number(body.attemptSlots)));
    if (!Number.isFinite(n)) {
      return NextResponse.json({ error: "Invalid attemptSlots" }, { status: 400 });
    }
    await prisma.testingSession.update({
      where: { id },
      data: { attemptSlots: n },
    });
    return NextResponse.json({ ok: true, attemptSlots: n });
  }

  if (body.name != null) {
    const name = String(body.name).trim();
    if (!name) {
      return NextResponse.json({ error: "Session name cannot be empty" }, { status: 400 });
    }
    await prisma.testingSession.update({ where: { id }, data: { name } });
    return NextResponse.json({ ok: true, name });
  }

  if (Array.isArray(body.activitySlugs) && body.activitySlugs.length > 0) {
    const slugs = Array.from(
      new Set<string>(
        body.activitySlugs.map((s: unknown) => String(s).trim()).filter(Boolean)
      )
    );
    const activities = await prisma.activity.findMany({
      where: {
        slug: { in: slugs },
        OR: [{ schoolId: null }, { schoolId: session.schoolId }],
      },
    });
    const existing = await prisma.testingSessionActivity.findMany({
      where: { sessionId: id },
      select: { activityId: true, sortOrder: true },
    });
    const existingIds = new Set(existing.map((e) => e.activityId));
    const maxOrder = existing.reduce((m, e) => Math.max(m, e.sortOrder), -1);
    const toAdd = activities.filter((a) => !existingIds.has(a.id));
    if (toAdd.length > 0) {
      await prisma.testingSessionActivity.createMany({
        data: toAdd.map((a, i) => ({
          sessionId: id,
          activityId: a.id,
          sortOrder: maxOrder + 1 + i,
        })),
      });
    }
    return NextResponse.json({
      ok: true,
      added: toAdd.map((a) => a.slug),
    });
  }

  if (typeof body.enrollStudentId === "string" && body.enrollStudentId.trim()) {
    const studentId = body.enrollStudentId.trim();
    const student = await prisma.studentProfile.findFirst({
      where: { id: studentId, schoolId: session.schoolId },
      select: { id: true },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    if (rec.classId) {
      await prisma.classEnrollment.createMany({
        data: [{ classId: rec.classId, studentId }],
        skipDuplicates: true,
      });
    }
    await prisma.testingSessionStudent.createMany({
      data: [{ sessionId: id, studentId }],
      skipDuplicates: true,
    });
    return NextResponse.json({ ok: true, studentId });
  }

  if (Array.isArray(body.studentIds) && body.studentIds.length > 0) {
    const ids = Array.from(
      new Set<string>(
        body.studentIds.map((s: unknown) => String(s).trim()).filter(Boolean)
      )
    );
    const enrolled = rec.classId
      ? await prisma.classEnrollment.findMany({
          where: { classId: rec.classId, studentId: { in: ids } },
          select: { studentId: true },
        })
      : [];
    const allowed = new Set(
      rec.classId ? enrolled.map((e) => e.studentId) : ids
    );
    const toAdd = ids.filter((sid) => allowed.has(sid));
    if (toAdd.length > 0) {
      await prisma.testingSessionStudent.createMany({
        data: toAdd.map((studentId) => ({ sessionId: id, studentId })),
        skipDuplicates: true,
      });
    }
    return NextResponse.json({ ok: true, addedStudents: toAdd.length });
  }

  const dateStr = String(body.testingDate ?? "").trim();
  if (!dateStr) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }
  const testingDate = calendarDateAtNoonUtc(dateStr);
  if (!testingDate) {
    return NextResponse.json({ error: "Test date is required (YYYY-MM-DD)" }, { status: 400 });
  }

  const previousDate = rec.testingDate;
  const results = await prisma.performanceResult.findMany({
    where: { testingSessionId: id, status: { not: "SUPERSEDED" } },
    select: { id: true, studentId: true, activityId: true, schoolId: true },
  });

  await prisma.$transaction([
    prisma.testingSession.update({
      where: { id },
      data: { testingDate },
    }),
    prisma.performanceResult.updateMany({
      where: { testingSessionId: id },
      data: { testingDate },
    }),
  ]);

  if (results.length > 0 && previousDate.getTime() !== testingDate.getTime()) {
    await recordPerformanceAudits(
      results.map((r) => ({
        eventType: "TESTING_DATE_SHIFTED" as const,
        resultId: r.id,
        studentId: r.studentId,
        activityId: r.activityId,
        schoolId: r.schoolId,
        actorUserId: session.userId,
        payload: {
          sessionId: id,
          previousTestingDate: previousDate.toISOString(),
          nextTestingDate: testingDate.toISOString(),
        },
      }))
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const rec = await prisma.testingSession.findFirst({
    where: { id, schoolId: session.schoolId, archivedAt: null },
    include: {
      _count: { select: { students: true, activities: true } },
    },
  });
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!(await coachCanAdministerTestingSession(session, id))) {
    return NextResponse.json({ error: "Not allowed for this session" }, { status: 403 });
  }

  const { deletedResults } = await deleteTestingSessionAndMarks(id, session.userId);

  return NextResponse.json({
    ok: true,
    archived: false,
    deletedResults,
    students: rec._count.students,
  });
}
