import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { calendarDateAtNoonUtc } from "@/lib/calendar-date";
import { dayBoundsFromDateString } from "@/lib/services/workouts";
import { archiveWorkoutSyncedMarksForAssignment } from "@/lib/services/workout-performance-sync";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.workoutAssignment.findFirst({
    where: { id, schoolId: session.schoolId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const body = await request.json();
  const data: { templateId?: string; scheduledDate?: Date; classId?: string } = {};

  if (body.templateId != null) {
    const templateId = String(body.templateId).trim();
    const template = await prisma.workoutTemplate.findFirst({
      where: { id: templateId, schoolId: session.schoolId },
      select: { id: true },
    });
    if (!template) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }
    data.templateId = template.id;
  }

  if (body.scheduledDate != null) {
    const dateStr = String(body.scheduledDate).trim();
    const bounds = dayBoundsFromDateString(dateStr);
    if (!bounds) {
      return NextResponse.json({ error: "Valid date required (YYYY-MM-DD)" }, { status: 400 });
    }
    const scheduledDate = calendarDateAtNoonUtc(dateStr);
    if (!scheduledDate) {
      return NextResponse.json({ error: "Valid date required (YYYY-MM-DD)" }, { status: 400 });
    }
    data.scheduledDate = scheduledDate;
  }

  if (body.classId != null) {
    const classId = String(body.classId).trim();
    const cls = await prisma.class.findFirst({
      where: { id: classId, schoolId: session.schoolId },
      select: { id: true },
    });
    if (!cls) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }
    data.classId = cls.id;
  }

  const updated = await prisma.workoutAssignment.update({
    where: { id },
    data,
    include: {
      template: { select: { id: true, name: true } },
      class: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    assignment: {
      id: updated.id,
      templateId: updated.templateId,
      templateName: updated.template.name,
      classId: updated.classId,
      scheduledDate: updated.scheduledDate.toISOString().slice(0, 10),
    },
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.workoutAssignment.findFirst({
    where: { id, schoolId: session.schoolId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  // Supersede synced performance marks before cascading session/set deletes.
  const { archived } = await archiveWorkoutSyncedMarksForAssignment(id);
  await prisma.workoutAssignment.delete({ where: { id } });
  return NextResponse.json({ ok: true, archivedMarks: archived });
}
