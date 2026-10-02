import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { WorkoutLogClient } from "@/components/workouts/workout-log-client";
import { StudentWorkoutClassPicker } from "@/components/workouts/student-workout-class-picker";
import { STUDENT_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { suggestWeightsForPrescribedSets } from "@/lib/queries/workout-1rm";
import { normalizeSetPrescriptions } from "@/lib/workout-prescriptions";
import {
  findStudentAssignmentForDate,
  listStudentAssignmentsForDate,
  getOrCreateWorkoutSession,
  todayDateString,
} from "@/lib/services/workouts";

export default async function StudentWorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const session = await requireSession(["STUDENT"]);
  if (!session?.studentId) redirect("/login");

  const sp = await searchParams;
  const dateStr = todayDateString();
  const allAssignments = await listStudentAssignmentsForDate(session.studentId, dateStr);
  const classOptions = allAssignments
    .filter((a) => a.class)
    .map((a) => ({
      id: a.classId!,
      name: a.class!.name,
      period: a.class!.period,
    }));
  const classId =
    sp.classId && classOptions.some((c) => c.id === sp.classId)
      ? sp.classId
      : classOptions[0]?.id;
  const assignment = await findStudentAssignmentForDate(
    session.studentId,
    dateStr,
    classId
  );

  let payload: {
    date: string;
    assignment: {
      id: string;
      className: string | null;
      template: {
        id: string;
        name: string;
        exercises: {
          id: string;
          defaultSets: number;
          defaultReps: number;
          notes: string | null;
          setPrescriptions?: unknown;
          activity: { slug: string; name: string; unit: string };
        }[];
      };
    } | null;
    session: {
      id: string;
      status: string;
      completedAt: string | null;
      setLogs: {
        templateExerciseId: string;
        setNumber: number;
        weightLb: number | null;
        reps: number | null;
        rpe: number | null;
        skipped: boolean;
      }[];
    } | null;
    suggestedWeightBySet?: Record<string, number | null>;
  } = { date: dateStr, assignment: null, session: null };

  if (assignment) {
    const workoutSession = await getOrCreateWorkoutSession(assignment.id, session.studentId);
    const exercises = assignment.template.exercises.map((ex) => {
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
      session.studentId,
      exercises
    );
    payload = {
      date: dateStr,
      assignment: {
        id: assignment.id,
        className: assignment.class?.name ?? null,
        template: {
          id: assignment.template.id,
          name: assignment.template.name,
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
  }

  return (
    <AppShell nav={STUDENT_NAV} title="Log workout">
      <Suspense fallback={null}>
        <StudentWorkoutClassPicker
          options={classOptions}
          classId={classId ?? ""}
        />
      </Suspense>
      <WorkoutLogClient initial={payload} />
    </AppShell>
  );
}
