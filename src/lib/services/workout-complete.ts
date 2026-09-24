import { prisma } from "@/lib/db";
import { syncWorkoutSessionToPerformance } from "@/lib/services/workout-performance-sync";

export async function validateWorkoutSessionComplete(sessionId: string): Promise<string | null> {
  const workoutSession = await prisma.workoutSession.findUnique({
    where: { id: sessionId },
    include: {
      assignment: {
        include: {
          template: { include: { exercises: { include: { activity: true } } } },
        },
      },
      setLogs: true,
    },
  });
  if (!workoutSession) return "Workout session not found";

  for (const ex of workoutSession.assignment.template.exercises) {
    for (let n = 1; n <= ex.defaultSets; n++) {
      const log = workoutSession.setLogs.find(
        (l) => l.templateExerciseId === ex.id && l.setNumber === n
      );
      if (!log) {
        return `Log every set or mark skipped (${ex.activity.name} set ${n})`;
      }
      if (!log.skipped && (log.weightLb == null || log.reps == null)) {
        return "Each logged set needs weight and reps, or mark the set skipped.";
      }
    }
  }
  return null;
}

export async function markWorkoutSessionComplete(
  sessionId: string,
  options?: { enteredById?: string }
) {
  const updated = await prisma.workoutSession.update({
    where: { id: sessionId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  await syncWorkoutSessionToPerformance(sessionId, options);
  return updated;
}
