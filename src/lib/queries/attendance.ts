import { prisma } from "@/lib/db";
import { studentsTargetedByWorkoutAssignment } from "@/lib/queries/workout-assignment-roster";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isAttendanceDate(value: string): boolean {
  return DATE_RE.test(value);
}

export type AttendanceStudent = {
  id: string;
  firstName: string;
  lastName: string;
  studentNumber: string;
  provisional: boolean;
  present: boolean | null;
};

export type CalendarAttendance = {
  date: string;
  presentCount: number;
  markedCount: number;
};

export async function listClassAttendanceRoster(input: {
  schoolId: string;
  classId: string;
  date: string;
  subgroupId?: string | null;
}): Promise<AttendanceStudent[]> {
  const roster = await studentsTargetedByWorkoutAssignment({
    classId: input.classId,
    subgroupId: input.subgroupId,
  });
  const marks = await prisma.classAttendance.findMany({
    where: {
      schoolId: input.schoolId,
      classId: input.classId,
      date: input.date,
      studentId: { in: roster.map((s) => s.id) },
    },
    select: { studentId: true, present: true },
  });
  const byStudent = new Map(marks.map((row) => [row.studentId, row.present]));
  return roster.map((student) => ({
    ...student,
    present: byStudent.has(student.id) ? Boolean(byStudent.get(student.id)) : null,
  }));
}

export async function listAttendanceForClassRange(input: {
  schoolId: string;
  classId: string;
  startDate: string;
  endDate: string;
  subgroupId?: string | null;
}): Promise<CalendarAttendance[]> {
  const roster = await studentsTargetedByWorkoutAssignment({
    classId: input.classId,
    subgroupId: input.subgroupId,
  });
  const ids = new Set(roster.map((s) => s.id));
  if (ids.size === 0) return [];

  const rows = await prisma.classAttendance.findMany({
    where: {
      schoolId: input.schoolId,
      classId: input.classId,
      date: { gte: input.startDate, lte: input.endDate },
      studentId: { in: [...ids] },
    },
    select: { date: true, present: true },
  });

  const byDate = new Map<string, { presentCount: number; markedCount: number }>();
  for (const row of rows) {
    const cur = byDate.get(row.date) ?? { presentCount: 0, markedCount: 0 };
    cur.markedCount += 1;
    if (row.present) cur.presentCount += 1;
    byDate.set(row.date, cur);
  }

  return [...byDate.entries()].map(([date, counts]) => ({ date, ...counts }));
}
