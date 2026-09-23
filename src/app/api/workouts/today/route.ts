import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import {
  findStudentAssignmentForDate,
  getOrCreateWorkoutSession,
  todayDateString,
} from "@/lib/services/workouts";

export async function GET(request: Request) {
  const session = await requireSession(["STUDENT"]);
  if (!session?.studentId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dateStr = url.searchParams.get("date")?.trim() || todayDateString();

  const assignment = await findStudentAssignmentForDate(session.studentId, dateStr);
  if (!assignment) {
    return NextResponse.json({ date: dateStr, assignment: null, session: null });
  }

  const workoutSession = await getOrCreateWorkoutSession(assignment.id, session.studentId);

  return NextResponse.json({
    date: dateStr,
    assignment: {
      id: assignment.id,
      scheduledDate: assignment.scheduledDate,
      className: assignment.class?.name ?? null,
      template: {
        id: assignment.template.id,
        name: assignment.template.name,
        exercises: assignment.template.exercises.map((ex) => ({
          id: ex.id,
          defaultSets: ex.defaultSets,
          defaultReps: ex.defaultReps,
          notes: ex.notes,
          activity: { slug: ex.activity.slug, name: ex.activity.name, unit: ex.activity.unit },
        })),
      },
    },
    session: {
      id: workoutSession.id,
      status: workoutSession.status,
      completedAt: workoutSession.completedAt,
      setLogs: workoutSession.setLogs.map((l) => ({
        templateExerciseId: l.templateExerciseId,
        setNumber: l.setNumber,
        weightLb: l.weightLb,
        reps: l.reps,
        rpe: l.rpe,
        skipped: l.skipped,
      })),
    },
  });
}
