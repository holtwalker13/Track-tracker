import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { LIFTING_WORKOUT_SLUGS } from "@/lib/lifting";
import { parseExerciseInput, type ExerciseInput } from "@/lib/services/workout-template-exercises";
import {
  listClassSavedWorkouts,
  savedWorkoutCreatorName,
} from "@/lib/queries/class-saved-workouts";

export async function GET(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const classId = new URL(request.url).searchParams.get("classId")?.trim() ?? "";
  const templates = classId
    ? await listClassSavedWorkouts(session.schoolId, classId)
    : await prisma.workoutTemplate.findMany({
        where: { schoolId: session.schoolId, createdById: session.userId, archivedAt: null },
        orderBy: { updatedAt: "desc" },
        include: {
          exercises: {
            orderBy: { sortOrder: "asc" },
            include: { activity: { select: { slug: true, name: true } } },
          },
          createdBy: { select: { firstName: true, lastName: true } },
          _count: { select: { assignments: true } },
        },
      });

  return NextResponse.json({
    templates: templates.map((template) => ({
      ...template,
      createdByName: savedWorkoutCreatorName(template.createdBy),
      canDelete: session.role === "ADMIN" || template.createdById === session.userId,
    })),
  });
}

export async function POST(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Program name is required" }, { status: 400 });
  }

  let exercises: ExerciseInput[] = Array.isArray(body.exercises) ? body.exercises : [];
  if (exercises.length === 0) {
    exercises = LIFTING_WORKOUT_SLUGS.map((slug) => ({
      activitySlug: slug,
      defaultSets: 3,
      defaultReps: 5,
    }));
  }

  const classId = body.classId ? String(body.classId) : null;
  if (classId) {
    const cls = await prisma.class.findFirst({
      where: { id: classId, schoolId: session.schoolId },
      select: { id: true },
    });
    if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const slugs = exercises.map((e) => String(e.activitySlug ?? "").trim()).filter(Boolean);
  const activities = await prisma.activity.findMany({ where: { slug: { in: slugs } } });
  const bySlug = new Map(activities.map((a) => [a.slug, a.id]));

  const missing = slugs.filter((s) => !bySlug.has(s));
  if (missing.length > 0) {
    return NextResponse.json({ error: `Unknown lifts: ${missing.join(", ")}` }, { status: 400 });
  }

  const rec = await prisma.workoutTemplate.create({
    data: {
      schoolId: session.schoolId,
      name,
      createdById: session.userId,
      classId,
      exercises: {
        create: exercises.map((e, i) => {
          const parsed = parseExerciseInput(e);
          return {
            activityId: bySlug.get(String(e.activitySlug).trim())!,
            defaultSets: parsed.defaultSets,
            defaultReps: parsed.defaultReps,
            setPrescriptions: parsed.setPrescriptions,
            notes: parsed.notes,
            sortOrder: i,
          };
        }),
      },
    },
    include: {
      exercises: {
        orderBy: { sortOrder: "asc" },
        include: { activity: { select: { slug: true, name: true } } },
      },
      createdBy: { select: { firstName: true, lastName: true } },
      _count: { select: { assignments: true } },
    },
  });

  return NextResponse.json({
    template: {
      ...rec,
      createdByName: savedWorkoutCreatorName(rec.createdBy),
      canDelete: true,
    },
  });
}
