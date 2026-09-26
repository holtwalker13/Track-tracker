import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  buildGeneratorPlan,
  WORKOUT_GENERATORS,
  type WorkoutGeneratorKey,
} from "@/lib/services/workout-generator";
import { dayBoundsFromDateString } from "@/lib/services/workouts";

export async function POST(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const generatorKey = String(body.generatorKey ?? "linear-5x5-mwf") as WorkoutGeneratorKey;
  if (!(generatorKey in WORKOUT_GENERATORS)) {
    return NextResponse.json({ error: "Unknown generator" }, { status: 400 });
  }

  const classId = String(body.classId ?? "").trim();
  const blockName = String(body.blockName ?? "").trim() || "Auto block";
  const dateStr = String(body.startDate ?? "").trim();
  const weeks = Math.min(12, Math.max(1, Number(body.weeks) || 4));

  if (!classId) {
    return NextResponse.json({ error: "Pick a class section" }, { status: 400 });
  }
  if (!dayBoundsFromDateString(dateStr)) {
    return NextResponse.json({ error: "Valid start date required (YYYY-MM-DD)" }, { status: 400 });
  }

  const cls = await prisma.class.findFirst({
    where: { id: classId, schoolId: session.schoolId },
  });
  if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  const startDate = new Date(`${dateStr}T12:00:00`);
  const plan = buildGeneratorPlan(generatorKey, { blockName, startDate, weeks });
  if (plan.length === 0) {
    return NextResponse.json({ error: "Generator produced no workouts" }, { status: 400 });
  }

  const slugs = [...new Set(plan.flatMap((d) => d.exercises.map((e) => e.activitySlug)))];
  const activities = await prisma.activity.findMany({ where: { slug: { in: slugs } } });
  const bySlug = new Map(activities.map((a) => [a.slug, a.id]));
  const missing = slugs.filter((s) => !bySlug.has(s));
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `Missing lifts in your catalog: ${missing.join(", ")}. Restore them in the lift library or KPI targets.`,
      },
      { status: 400 }
    );
  }

  const generatorBlockId = crypto.randomUUID();
  const schoolId = session.schoolId;
  const userId = session.userId;

  try {
    const created = await prisma.$transaction(async (tx) => {
      let assignmentCount = 0;
      for (const day of plan) {
        const template = await tx.workoutTemplate.create({
          data: {
            schoolId,
            name: day.name,
            sourceType: "GENERATED",
            generatorKey,
            generatorBlockId,
            createdById: userId,
            exercises: {
              create: day.exercises.map((e, i) => ({
                activityId: bySlug.get(e.activitySlug)!,
                defaultSets: e.defaultSets,
                defaultReps: e.defaultReps,
                notes: e.notes ?? null,
                sortOrder: i,
              })),
            },
          },
        });

        const dayStr = day.date.toISOString().slice(0, 10);
        const assignment = await tx.workoutAssignment.create({
          data: {
            schoolId,
            templateId: template.id,
            classId,
            scheduledDate: new Date(`${dayStr}T12:00:00`),
            generatorBlockId,
            createdById: userId,
          },
        });

        const enrollments = await tx.classEnrollment.findMany({
          where: { classId },
          select: { studentId: true },
        });
        if (enrollments.length > 0) {
          await tx.workoutSession.createMany({
            data: enrollments.map((e) => ({
              assignmentId: assignment.id,
              studentId: e.studentId,
              status: "IN_PROGRESS",
            })),
            skipDuplicates: true,
          });
        }
        assignmentCount += 1;
      }
      return assignmentCount;
    });

    return NextResponse.json({
      generatorBlockId,
      assignmentsCreated: created,
      generatorLabel: WORKOUT_GENERATORS[generatorKey].label,
    });
  } catch (e) {
    console.error("[workouts/generate]", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Could not generate block — check class roster and lift library.",
      },
      { status: 500 }
    );
  }
}
