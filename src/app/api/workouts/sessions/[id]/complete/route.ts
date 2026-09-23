import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(["STUDENT"]);
  if (!session?.studentId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;
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
  if (!workoutSession || workoutSession.studentId !== session.studentId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  for (const ex of workoutSession.assignment.template.exercises) {
    for (let n = 1; n <= ex.defaultSets; n++) {
      const log = workoutSession.setLogs.find(
        (l) => l.templateExerciseId === ex.id && l.setNumber === n
      );
      if (!log) {
        return NextResponse.json(
          {
            error: `Log every set or mark skipped (${ex.activity.name} set ${n})`,
          },
          { status: 400 }
        );
      }
      if (!log.skipped && (log.weightLb == null || log.reps == null)) {
        return NextResponse.json(
          { error: "Each logged set needs weight and reps, or mark the set skipped." },
          { status: 400 }
        );
      }
    }
  }

  const updated = await prisma.workoutSession.update({
    where: { id: sessionId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  return NextResponse.json({ session: updated });
}
