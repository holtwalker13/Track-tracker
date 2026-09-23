import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { upsertWorkoutSets, validateRpe, type WorkoutSetInput } from "@/lib/services/workouts";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(["STUDENT", "COACH", "ADMIN"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;
  const workoutSession = await prisma.workoutSession.findUnique({
    where: { id: sessionId },
    include: { assignment: { select: { schoolId: true } } },
  });
  if (!workoutSession) {
    return NextResponse.json({ error: "Workout session not found" }, { status: 404 });
  }

  if (session.role === "STUDENT") {
    if (session.studentId !== workoutSession.studentId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (session.schoolId !== workoutSession.assignment.schoolId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (workoutSession.status === "COMPLETED" && session.role === "STUDENT") {
    return NextResponse.json({ error: "Workout already submitted. Ask your coach to reopen." }, { status: 400 });
  }

  const body = await request.json();
  const raw = Array.isArray(body.sets) ? body.sets : [];
  const sets: WorkoutSetInput[] = [];

  for (const row of raw) {
    const templateExerciseId = String(row.templateExerciseId ?? "").trim();
    const setNumber = Number(row.setNumber);
    if (!templateExerciseId || !Number.isInteger(setNumber) || setNumber < 1) continue;

    const skipped = Boolean(row.skipped);
    const weightLb = row.weightLb != null && row.weightLb !== "" ? Number(row.weightLb) : null;
    const reps = row.reps != null && row.reps !== "" ? Number(row.reps) : null;
    const rpe = row.rpe != null && row.rpe !== "" ? Number(row.rpe) : null;

    if (!skipped) {
      if (weightLb != null && (Number.isNaN(weightLb) || weightLb < 0)) {
        return NextResponse.json({ error: "Invalid weight" }, { status: 400 });
      }
      if (reps != null && (!Number.isInteger(reps) || reps < 0)) {
        return NextResponse.json({ error: "Invalid reps" }, { status: 400 });
      }
      if (!validateRpe(rpe)) {
        return NextResponse.json({ error: "RPE must be between 6 and 10" }, { status: 400 });
      }
    }

    sets.push({
      templateExerciseId,
      setNumber,
      weightLb: skipped ? null : weightLb,
      reps: skipped ? null : reps,
      rpe: skipped ? null : rpe,
      skipped,
    });
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "No sets to save" }, { status: 400 });
  }

  await upsertWorkoutSets(sessionId, sets);

  return NextResponse.json({ ok: true });
}
