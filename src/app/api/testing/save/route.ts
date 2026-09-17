import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { saveAttemptResults } from "@/lib/services/results";
import { DEFAULT_CLASS_YEAR } from "@/lib/grades";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== "COACH" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    studentId,
    activityId,
    testingSessionId,
    attempts,
    status,
    weightAtTest,
  } = body;

  const sessionRec = await prisma.testingSession.findUniqueOrThrow({
    where: { id: testingSessionId },
    include: { school: true },
  });

  if (session.schoolId && sessionRec.schoolId !== session.schoolId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const enrollment = await prisma.studentEnrollment.findFirst({
    where: {
      studentId,
      schoolYearId: sessionRec.schoolYearId,
    },
  });

  const result = await saveAttemptResults({
    studentId,
    activityId,
    testingSessionId,
    schoolId: sessionRec.schoolId,
    schoolYearId: sessionRec.schoolYearId,
    organizationId: sessionRec.school.organizationId,
    gradeLevel: enrollment?.gradeLevel ?? sessionRec.gradeLevel ?? DEFAULT_CLASS_YEAR,
    testingDate: sessionRec.testingDate,
    attempts: (attempts as (number | null)[]) ?? [],
    status,
    enteredById: session.userId,
    entryMethod: "LIVE_GRID",
    weightAtTest,
  });

  return NextResponse.json(result);
}
