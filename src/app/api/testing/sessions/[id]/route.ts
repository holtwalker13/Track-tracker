import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

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

  // Detach any results, then remove session (cascades activity/student joins).
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
