import { prisma } from "@/lib/db";

export function dayBoundsFromDateString(dateStr: string): { start: Date; end: Date } | null {
  const trimmed = dateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return {
    start: new Date(`${trimmed}T00:00:00`),
    end: new Date(`${trimmed}T23:59:59.999`),
  };
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function findStudentAssignmentForDate(studentId: string, dateStr: string) {
  const bounds = dayBoundsFromDateString(dateStr);
  if (!bounds) return null;

  const classIds = (
    await prisma.classEnrollment.findMany({
      where: { studentId },
      select: { classId: true },
    })
  ).map((e) => e.classId);

  if (classIds.length === 0) return null;

  const direct = await prisma.workoutAssignment.findFirst({
    where: {
      studentId,
      scheduledDate: { gte: bounds.start, lte: bounds.end },
    },
    include: {
      template: {
        include: {
          exercises: {
            orderBy: { sortOrder: "asc" },
            include: { activity: true },
          },
        },
      },
      class: true,
    },
    orderBy: { createdAt: "desc" },
  });
  if (direct) return direct;

  return prisma.workoutAssignment.findFirst({
    where: {
      classId: { in: classIds },
      scheduledDate: { gte: bounds.start, lte: bounds.end },
    },
    include: {
      template: {
        include: {
          exercises: {
            orderBy: { sortOrder: "asc" },
            include: { activity: true },
          },
        },
      },
      class: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrCreateWorkoutSession(assignmentId: string, studentId: string) {
  const existing = await prisma.workoutSession.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId } },
    include: {
      setLogs: true,
      assignment: {
        include: {
          template: {
            include: {
              exercises: {
                orderBy: { sortOrder: "asc" },
                include: { activity: true },
              },
            },
          },
        },
      },
    },
  });
  if (existing) return existing;

  return prisma.workoutSession.create({
    data: {
      assignmentId,
      studentId,
      status: "IN_PROGRESS",
    },
    include: {
      setLogs: true,
      assignment: {
        include: {
          template: {
            include: {
              exercises: {
                orderBy: { sortOrder: "asc" },
                include: { activity: true },
              },
            },
          },
        },
      },
    },
  });
}

export type WorkoutSetInput = {
  templateExerciseId: string;
  setNumber: number;
  weightLb?: number | null;
  reps?: number | null;
  rpe?: number | null;
  skipped?: boolean;
};

export async function upsertWorkoutSets(sessionId: string, sets: WorkoutSetInput[]) {
  for (const s of sets) {
    const skipped = Boolean(s.skipped);
    await prisma.workoutSetLog.upsert({
      where: {
        sessionId_templateExerciseId_setNumber: {
          sessionId,
          templateExerciseId: s.templateExerciseId,
          setNumber: s.setNumber,
        },
      },
      create: {
        sessionId,
        templateExerciseId: s.templateExerciseId,
        setNumber: s.setNumber,
        weightLb: skipped ? null : (s.weightLb ?? null),
        reps: skipped ? null : (s.reps ?? null),
        rpe: skipped ? null : (s.rpe ?? null),
        skipped,
      },
      update: {
        weightLb: skipped ? null : (s.weightLb ?? null),
        reps: skipped ? null : (s.reps ?? null),
        rpe: skipped ? null : (s.rpe ?? null),
        skipped,
      },
    });
  }
}

export function validateRpe(rpe: number | null | undefined): boolean {
  if (rpe == null) return true;
  return rpe >= 6 && rpe <= 10;
}
