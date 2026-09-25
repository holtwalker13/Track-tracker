import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { WorkoutLogClient } from "@/components/workouts/workout-log-client";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { suggestWeightsForPrescribedSets } from "@/lib/queries/workout-1rm";
import { normalizeSetPrescriptions } from "@/lib/workout-prescriptions";

export default async function CoachWorkoutSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const session = await requireSchoolSession();
  const { sessionId } = await params;

  const workoutSession = await prisma.workoutSession.findUnique({
    where: { id: sessionId },
    include: {
      student: { select: { firstName: true, lastName: true, studentNumber: true } },
      setLogs: true,
      assignment: {
        include: {
          class: { select: { name: true } },
          template: {
            include: {
              exercises: {
                orderBy: { sortOrder: "asc" },
                include: { activity: true },
              },
            },
          },
        },
      },
    },
  });

  if (!workoutSession || workoutSession.assignment.schoolId !== session.schoolId) {
    notFound();
  }

  const exercises = workoutSession.assignment.template.exercises.map((ex) => {
    const sets = normalizeSetPrescriptions(ex.setPrescriptions, ex.defaultSets, ex.defaultReps);
    return {
      id: ex.id,
      defaultSets: sets.length,
      defaultReps: sets[0]?.reps ?? ex.defaultReps,
      notes: ex.notes,
      setPrescriptions: sets,
      activity: {
        slug: ex.activity.slug,
        name: ex.activity.name,
        unit: ex.activity.unit,
      },
    };
  });
  const suggestedWeightBySet = await suggestWeightsForPrescribedSets(
    workoutSession.studentId,
    exercises
  );

  const dateStr = workoutSession.assignment.scheduledDate.toISOString().slice(0, 10);

  const payload = {
    date: dateStr,
    assignment: {
      id: workoutSession.assignment.id,
      className: workoutSession.assignment.class?.name ?? null,
      template: {
        id: workoutSession.assignment.template.id,
        name: workoutSession.assignment.template.name,
        exercises,
      },
    },
    session: {
      id: workoutSession.id,
      status: workoutSession.status,
      completedAt: workoutSession.completedAt?.toISOString() ?? null,
      setLogs: workoutSession.setLogs.map((l) => ({
        templateExerciseId: l.templateExerciseId,
        setNumber: l.setNumber,
        weightLb: l.weightLb,
        reps: l.reps,
        rpe: l.rpe,
        skipped: l.skipped,
      })),
    },
    suggestedWeightBySet,
  };

  const studentName = `${workoutSession.student.firstName} ${workoutSession.student.lastName}`;

  return (
    <AppShell nav={COACH_NAV} title="Athlete workout">
      <p className="mb-4 text-sm">
        <Link href={`/coach/programs/logs?date=${dateStr}`} className="text-accent hover:underline">
          ← Workout logs
        </Link>
      </p>
      <WorkoutLogClient
        initial={payload}
        coachMeta={{
          studentName,
          studentNumber: workoutSession.student.studentNumber,
        }}
      />
    </AppShell>
  );
}
