import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { dayBoundsFromDateString } from "@/lib/services/workouts";

export async function GET(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const classId = params.get("classId")?.trim();
  const dateStr = params.get("date")?.trim();
  if (!classId || !dateStr) {
    return NextResponse.json({ error: "classId and date required" }, { status: 400 });
  }

  const bounds = dayBoundsFromDateString(dateStr);
  if (!bounds) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const cls = await prisma.class.findFirst({
    where: { id: classId, schoolId: session.schoolId },
    select: { id: true },
  });
  if (!cls) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const assignment = await prisma.workoutAssignment.findFirst({
    where: {
      schoolId: session.schoolId,
      classId,
      scheduledDate: { gte: bounds.start, lte: bounds.end },
    },
    include: {
      template: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!assignment) {
    return NextResponse.json({ assignment: null });
  }

  return NextResponse.json({
    assignment: {
      id: assignment.id,
      templateId: assignment.templateId,
      templateName: assignment.template.name,
    },
  });
}

export async function POST(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const templateId = String(body.templateId ?? "").trim();
  const classId = body.classId ? String(body.classId).trim() : "";
  const dateStr = String(body.scheduledDate ?? "").trim();

  if (!templateId) {
    return NextResponse.json({ error: "Pick a program to assign" }, { status: 400 });
  }
  if (!classId) {
    return NextResponse.json({ error: "Pick a class section" }, { status: 400 });
  }
  const bounds = dayBoundsFromDateString(dateStr);
  if (!bounds) {
    return NextResponse.json({ error: "Valid scheduled date is required (YYYY-MM-DD)" }, { status: 400 });
  }

  const template = await prisma.workoutTemplate.findFirst({
    where: { id: templateId, schoolId: session.schoolId },
  });
  if (!template) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  const cls = await prisma.class.findFirst({
    where: { id: classId, schoolId: session.schoolId },
  });
  if (!cls) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const scheduledDate = new Date(`${dateStr}T12:00:00`);

  const rec = await prisma.workoutAssignment.create({
    data: {
      schoolId: session.schoolId,
      templateId,
      classId,
      scheduledDate,
      createdById: session.userId,
    },
    include: {
      template: { select: { name: true } },
      class: {
        select: {
          name: true,
          period: true,
          enrollments: { select: { studentId: true } },
        },
      },
    },
  });

  const studentIds = rec.class?.enrollments.map((e) => e.studentId) ?? [];
  if (studentIds.length > 0) {
    await prisma.workoutSession.createMany({
      data: studentIds.map((studentId) => ({
        assignmentId: rec.id,
        studentId,
        status: "IN_PROGRESS",
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({
    assignment: {
      id: rec.id,
      templateId: rec.templateId,
      template: rec.template,
      class: { name: rec.class?.name, period: rec.class?.period },
    },
  });
}
