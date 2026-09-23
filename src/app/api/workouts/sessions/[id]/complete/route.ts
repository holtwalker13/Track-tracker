import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  markWorkoutSessionComplete,
  validateWorkoutSessionComplete,
} from "@/lib/services/workout-complete";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(["STUDENT", "COACH", "ADMIN"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;
  const workoutSession = await prisma.workoutSession.findUnique({
    where: { id: sessionId },
    include: { assignment: { select: { schoolId: true } }, student: { select: { schoolId: true } } },
  });
  if (!workoutSession) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (session.role === "STUDENT") {
    if (!session.studentId || workoutSession.studentId !== session.studentId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } else if (session.schoolId !== workoutSession.assignment.schoolId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const validationError = await validateWorkoutSessionComplete(sessionId);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const updated = await markWorkoutSessionComplete(sessionId);
  return NextResponse.json({ session: updated });
}
