import { prisma } from "@/lib/db";
import { studentsTargetedByWorkoutAssignment } from "@/lib/queries/workout-assignment-roster";
import { dayBoundsFromDateString, getOrCreateWorkoutSession } from "@/lib/services/workouts";
import type { WorkoutLogExportRow } from "@/lib/services/workout-export";
import type { LiftLogSample } from "@/lib/services/workout-progression";
import { suggestWorkingWeight } from "@/lib/services/workout-progression";

export async function getRecentLiftHistory(
  studentId: string,
  activitySlug: string,
  take = 30
): Promise<LiftLogSample[]> {
  const logs = await prisma.workoutSetLog.findMany({
    where: {
      skipped: false,
      weightLb: { not: null },
      reps: { not: null },
      templateExercise: { activity: { slug: activitySlug } },
      session: {
        studentId,
        status: "COMPLETED",
      },
    },
    orderBy: [{ session: { completedAt: "desc" } }, { setNumber: "asc" }],
    take,
    select: { weightLb: true, reps: true, rpe: true },
  });

  return logs
    .filter((l) => l.weightLb != null && l.reps != null)
    .map((l) => ({
      weightLb: l.weightLb!,
      reps: l.reps!,
      rpe: l.rpe,
    }));
}

export async function suggestWeightsForExercises(
  studentId: string,
  exercises: { id: string; defaultReps: number; activity: { slug: string } }[]
): Promise<Record<string, number | null>> {
  const out: Record<string, number | null> = {};
  for (const ex of exercises) {
    const history = await getRecentLiftHistory(studentId, ex.activity.slug);
    out[ex.id] = suggestWorkingWeight(history, ex.defaultReps, 8);
  }
  return out;
}

export async function fetchWorkoutLogExportRows(input: {
  schoolId: string;
  dateStr: string;
  classId?: string;
}): Promise<WorkoutLogExportRow[]> {
  const bounds = dayBoundsFromDateString(input.dateStr);
  if (!bounds) return [];

  const assignments = await prisma.workoutAssignment.findMany({
    where: {
      schoolId: input.schoolId,
      scheduledDate: { gte: bounds.start, lte: bounds.end },
      ...(input.classId ? { classId: input.classId } : {}),
    },
    include: {
      class: { select: { name: true } },
      template: { select: { name: true } },
      sessions: {
        include: {
          student: {
            select: { studentNumber: true, firstName: true, lastName: true },
          },
          setLogs: {
            include: {
              templateExercise: {
                include: { activity: { select: { slug: true, name: true } } },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const rows: WorkoutLogExportRow[] = [];
  const workoutDate = input.dateStr;

  for (const assignment of assignments) {
    const sessionsByStudent = new Map(assignment.sessions.map((s) => [s.studentId, s]));

    const classId = assignment.classId;
    const rosterStudents =
      classId != null
        ? (
            await prisma.classEnrollment.findMany({
              where: { classId },
              include: {
                student: {
                  select: { id: true, studentNumber: true, firstName: true, lastName: true },
                },
              },
            })
          ).map((e) => e.student)
        : assignment.sessions.map((s) => ({
            id: s.studentId,
            studentNumber: s.student.studentNumber,
            firstName: s.student.firstName,
            lastName: s.student.lastName,
          }));

    for (const student of rosterStudents) {
      const session = sessionsByStudent.get(student.id);
      if (!session) {
        rows.push({
          workoutDate,
          className: assignment.class?.name ?? "",
          programName: assignment.template.name,
          studentNumber: student.studentNumber,
          studentFirstName: student.firstName,
          studentLastName: student.lastName,
          liftSlug: "",
          liftName: "",
          setNumber: 0,
          weightLb: "",
          reps: "",
          rpe: "",
          skipped: "",
          sessionStatus: "NOT_STARTED",
          submittedAt: "",
        });
        continue;
      }

      const submittedAt = session.completedAt?.toISOString() ?? "";
      if (session.setLogs.length === 0) {
        rows.push({
          workoutDate,
          className: assignment.class?.name ?? "",
          programName: assignment.template.name,
          studentNumber: student.studentNumber,
          studentFirstName: student.firstName,
          studentLastName: student.lastName,
          liftSlug: "",
          liftName: "",
          setNumber: 0,
          weightLb: "",
          reps: "",
          rpe: "",
          skipped: "",
          sessionStatus: session.status,
          submittedAt,
        });
        continue;
      }
      for (const log of session.setLogs.sort(
        (a, b) =>
          a.templateExercise.sortOrder - b.templateExercise.sortOrder ||
          a.setNumber - b.setNumber
      )) {
        rows.push({
          workoutDate,
          className: assignment.class?.name ?? "",
          programName: assignment.template.name,
          studentNumber: student.studentNumber,
          studentFirstName: student.firstName,
          studentLastName: student.lastName,
          liftSlug: log.templateExercise.activity.slug,
          liftName: log.templateExercise.activity.name,
          setNumber: log.setNumber,
          weightLb: log.weightLb != null ? String(log.weightLb) : "",
          reps: log.reps != null ? String(log.reps) : "",
          rpe: log.rpe != null ? String(log.rpe) : "",
          skipped: log.skipped ? "yes" : "no",
          sessionStatus: session.status,
          submittedAt,
        });
      }
    }
  }

  return rows;
}

export type CoachWorkoutLogRow = {
  sessionId: string | null;
  studentId: string;
  studentName: string;
  studentNumber: string;
  programName: string;
  className: string;
  status: string;
  setLogCount: number;
  completedAt: string | null;
  scheduledDate: string;
};

export async function listWorkoutSessionsForCoach(input: {
  schoolId: string;
  dateStr: string;
  classId?: string;
  subgroupId?: string;
}): Promise<CoachWorkoutLogRow[]> {
  return listWorkoutSessionsForCoachRange({
    schoolId: input.schoolId,
    startDate: input.dateStr,
    endDate: input.dateStr,
    classId: input.classId,
    subgroupId: input.subgroupId,
  });
}

export async function listWorkoutSessionsForCoachRange(input: {
  schoolId: string;
  startDate: string;
  endDate: string;
  classId?: string;
  subgroupId?: string;
}): Promise<CoachWorkoutLogRow[]> {
  const startBounds = dayBoundsFromDateString(input.startDate);
  const endBounds = dayBoundsFromDateString(input.endDate);
  if (!startBounds || !endBounds) return [];

  const assignmentsWithSessions = await prisma.workoutAssignment.findMany({
    where: {
      schoolId: input.schoolId,
      scheduledDate: { gte: startBounds.start, lte: endBounds.end },
      ...(input.classId ? { classId: input.classId } : {}),
    },
    include: {
      class: { select: { name: true, id: true } },
      template: { select: { name: true } },
      sessions: {
        include: {
          student: { select: { id: true, firstName: true, lastName: true, studentNumber: true } },
          _count: { select: { setLogs: true } },
        },
      },
    },
    orderBy: [{ scheduledDate: "desc" }, { createdAt: "desc" }],
  });

  let scopeSubgroupMemberIds: Set<string> | null = null;
  if (input.subgroupId) {
    const members = await prisma.classSubgroupMember.findMany({
      where: { subgroupId: input.subgroupId },
      select: { studentId: true },
    });
    scopeSubgroupMemberIds = new Set(members.map((m) => m.studentId));
  }

  const rows: CoachWorkoutLogRow[] = [];
  for (const a of assignmentsWithSessions) {
    const sessionsByStudent = new Map(a.sessions.map((s) => [s.studentId, s]));

    const students = await studentsTargetedByWorkoutAssignment({
      assignmentId: a.id,
      classId: a.classId,
      subgroupId: a.subgroupId,
      studentId: a.studentId,
    });

    for (const student of students) {
      await getOrCreateWorkoutSession(a.id, student.id);
    }

    const scheduledDate = a.scheduledDate.toISOString().slice(0, 10);

    for (const student of students) {
      if (scopeSubgroupMemberIds && !scopeSubgroupMemberIds.has(student.id)) continue;
      const s = sessionsByStudent.get(student.id);
      rows.push({
        sessionId: s?.id ?? null,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        studentNumber: student.studentNumber,
        programName: a.template.name,
        className: a.class?.name ?? "",
        status: s?.status ?? "NOT_STARTED",
        setLogCount: s?._count.setLogs ?? 0,
        completedAt: s?.completedAt?.toISOString() ?? null,
        scheduledDate,
      });
    }
  }

  rows.sort((x, y) => {
    const byDate = y.scheduledDate.localeCompare(x.scheduledDate);
    if (byDate !== 0) return byDate;
    return x.studentName.localeCompare(y.studentName);
  });
  return rows;
}
