import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isWithinLiveWindow } from "@/lib/constants";

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
    where: { id, schoolId: session.schoolId },
  });
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();

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

  const dateStr = String(body.testingDate ?? "").trim();
  if (!dateStr) {
    return NextResponse.json({ error: "Test date is required" }, { status: 400 });
  }
  const testingDate = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(testingDate.getTime())) {
    return NextResponse.json({ error: "Invalid test date" }, { status: 400 });
  }

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
    where: { id, schoolId: session.schoolId },
    include: {
      _count: { select: { students: true, activities: true } },
    },
  });
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const resultCount = await prisma.performanceResult.count({
    where: { testingSessionId: id },
  });

  await prisma.$transaction([
    prisma.performanceResult.updateMany({
      where: { testingSessionId: id },
      data: { testingSessionId: null },
    }),
    prisma.testingSession.delete({ where: { id } }),
  ]);

  return NextResponse.json({
    ok: true,
    detachedResults: resultCount,
    students: rec._count.students,
  });
}
