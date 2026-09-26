import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { saveAttemptResults } from "@/lib/services/results";
import { DEFAULT_CLASS_YEAR } from "@/lib/grades";
import {
  celebrationLabel,
  getPeriodBoardHits,
  shouldCelebrate,
  type PeriodBoardHit,
} from "@/lib/services/testing-celebration";

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

  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (sessionRec.schoolId !== session.schoolId) {
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

  let boardHits: PeriodBoardHit[] = [];
  let celebrate = false;
  let celebrateLabel: string | null = null;

  if (result.saved && "best" in result && result.best != null) {
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      select: { slug: true },
    });
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      select: { gender: true },
    });
    if (activity) {
      boardHits = await getPeriodBoardHits({
        schoolId: sessionRec.schoolId,
        activitySlug: activity.slug,
        studentId,
        gender: student?.gender,
      });
      celebrate = shouldCelebrate(Boolean(result.pr), boardHits);
      celebrateLabel = celebrationLabel(Boolean(result.pr), boardHits);
    }
  }

  return NextResponse.json({
    ...result,
    boardHits,
    celebrate,
    celebrateLabel,
  });
}
