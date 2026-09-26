import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { saveAttemptResults } from "@/lib/services/results";
import { DEFAULT_CLASS_YEAR } from "@/lib/grades";
import { isLiveRecordingOpen } from "@/lib/constants";
import {
  celebrationLabel,
  getPeriodBoardHits,
  shouldCelebrate,
  type PeriodBoardHit,
} from "@/lib/services/testing-celebration";

export async function POST(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
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

  if (!studentId || !activityId || !testingSessionId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const sessionRec = await prisma.testingSession.findUnique({
    where: { id: testingSessionId },
    include: { school: true },
  });
  if (!sessionRec || sessionRec.schoolId !== session.schoolId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    !isLiveRecordingOpen(
      sessionRec.status,
      sessionRec.recordingUnlocked,
      sessionRec.liveOpenedAt
    )
  ) {
    return NextResponse.json(
      { error: "Recording is closed for this session" },
      { status: 403 }
    );
  }

  const [student, sessionStudent, sessionActivity] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { id: String(studentId) },
      select: { id: true, schoolId: true },
    }),
    prisma.testingSessionStudent.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: testingSessionId,
          studentId: String(studentId),
        },
      },
    }),
    prisma.testingSessionActivity.findUnique({
      where: {
        sessionId_activityId: {
          sessionId: testingSessionId,
          activityId: String(activityId),
        },
      },
    }),
  ]);

  if (!student || student.schoolId !== session.schoolId) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }
  if (!sessionStudent) {
    return NextResponse.json({ error: "Student not in this session" }, { status: 403 });
  }
  if (!sessionActivity) {
    return NextResponse.json({ error: "Activity not in this session" }, { status: 403 });
  }

  const enrollment = await prisma.studentEnrollment.findFirst({
    where: {
      studentId: student.id,
      schoolYearId: sessionRec.schoolYearId,
    },
  });

  const result = await saveAttemptResults({
    studentId: student.id,
    activityId: String(activityId),
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
      where: { id: String(activityId) },
      select: { slug: true },
    });
    const studentMeta = await prisma.studentProfile.findUnique({
      where: { id: student.id },
      select: { gender: true },
    });
    if (activity) {
      boardHits = await getPeriodBoardHits({
        schoolId: sessionRec.schoolId,
        activitySlug: activity.slug,
        studentId: student.id,
        gender: studentMeta?.gender,
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
