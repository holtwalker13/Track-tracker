import { prisma } from "@/lib/db";
import { coachCanAdministerTestsForClass } from "@/lib/auth/coach-scope";
import type { SessionPayload } from "@/lib/auth/session";
import { isAttendanceDate } from "@/lib/queries/attendance";
import { studentsTargetedByWorkoutAssignment } from "@/lib/queries/workout-assignment-roster";

type Session = SessionPayload & { schoolId?: string };

async function assertCanMark(
  session: Session,
  classId: string
): Promise<{ ok: true; schoolId: string } | { ok: false; error: string; status: number }> {
  if (!session.schoolId) return { ok: false, error: "Unauthorized", status: 401 };
  const cls = await prisma.class.findFirst({
    where: { id: classId, schoolId: session.schoolId },
    select: { id: true },
  });
  if (!cls) return { ok: false, error: "Class not found", status: 404 };
  if (!(await coachCanAdministerTestsForClass(session, classId))) {
    return { ok: false, error: "You can only mark attendance for a class you lead.", status: 403 };
  }
  return { ok: true, schoolId: session.schoolId };
}

export async function upsertClassAttendance(input: {
  session: Session;
  classId: string;
  date: string;
  studentId: string;
  present: boolean;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!isAttendanceDate(input.date)) {
    return { ok: false, error: "Date must be YYYY-MM-DD", status: 400 };
  }
  const access = await assertCanMark(input.session, input.classId);
  if (!access.ok) return access;

  const roster = await studentsTargetedByWorkoutAssignment({ classId: input.classId });
  if (!roster.some((s) => s.id === input.studentId)) {
    return { ok: false, error: "Student is not on this class roster", status: 400 };
  }

  await prisma.classAttendance.upsert({
    where: {
      classId_studentId_date: {
        classId: input.classId,
        studentId: input.studentId,
        date: input.date,
      },
    },
    create: {
      schoolId: access.schoolId,
      classId: input.classId,
      studentId: input.studentId,
      date: input.date,
      present: input.present,
      recordedByUserId: input.session.userId,
    },
    update: {
      present: input.present,
      recordedByUserId: input.session.userId,
    },
  });
  return { ok: true };
}

export async function markClassAttendanceAll(input: {
  session: Session;
  classId: string;
  date: string;
  present: boolean;
  subgroupId?: string | null;
}): Promise<{ ok: true; count: number } | { ok: false; error: string; status: number }> {
  if (!isAttendanceDate(input.date)) {
    return { ok: false, error: "Date must be YYYY-MM-DD", status: 400 };
  }
  const access = await assertCanMark(input.session, input.classId);
  if (!access.ok) return access;

  const roster = await studentsTargetedByWorkoutAssignment({
    classId: input.classId,
    subgroupId: input.subgroupId,
  });

  if (roster.length === 0) return { ok: true, count: 0 };

  await prisma.$transaction(
    roster.map((student) =>
      prisma.classAttendance.upsert({
        where: {
          classId_studentId_date: {
            classId: input.classId,
            studentId: student.id,
            date: input.date,
          },
        },
        create: {
          schoolId: access.schoolId,
          classId: input.classId,
          studentId: student.id,
          date: input.date,
          present: input.present,
          recordedByUserId: input.session.userId,
        },
        update: {
          present: input.present,
          recordedByUserId: input.session.userId,
        },
      })
    )
  );

  return { ok: true, count: roster.length };
}
