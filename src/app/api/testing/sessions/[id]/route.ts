import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isWithinLiveWindow } from "@/lib/constants";
import { coachCanAdministerTestingSession } from "@/lib/auth/coach-scope";
import { calendarDateAtNoonUtc } from "@/lib/calendar-date";
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
        data: { status: "CLOSED", recordingUnlocked: false },
      });
      return NextResponse.json({ ok: true, status: "CLOSED" });
    }
    if (action === "pause") {
      await prisma.testingSession.update({
        where: { id },
        data: { status: "PAUSED", recordingUnlocked: false },
      });
      return NextResponse.json({ ok: true, status: "PAUSED" });
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

  const dateStr = String(body.testingDate ?? "").trim();
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

  const resultCount = await prisma.performanceResult.count({
    where: { testingSessionId: id, status: { not: "SUPERSEDED" } },
  });

  // Sessions with marks are soft-archived so athlete history is never wiped by
  // an accidental delete or an app update. Empty sessions may be hard-deleted.
  if (resultCount > 0) {
    const results = await prisma.performanceResult.findMany({
      where: { testingSessionId: id, status: { not: "SUPERSEDED" } },
      select: { id: true, studentId: true, activityId: true, schoolId: true },
    });

    await prisma.testingSession.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        status: "CLOSED",
        recordingUnlocked: false,
      },
    });

    await recordPerformanceAudits(
      results.map((r) => ({
        eventType: "ARCHIVED_SESSION" as const,
        resultId: r.id,
        studentId: r.studentId,
        activityId: r.activityId,
        schoolId: r.schoolId,
        actorUserId: session.userId,
        payload: { sessionId: id, sessionName: rec.name },
      }))
    );

    return NextResponse.json({
      ok: true,
      archived: true,
      deletedResults: 0,
      preservedResults: resultCount,
      students: rec._count.students,
    });
  }

  await prisma.testingSession.delete({ where: { id } });

  return NextResponse.json({
    ok: true,
    archived: false,
    deletedResults: 0,
    students: rec._count.students,
  });
}
