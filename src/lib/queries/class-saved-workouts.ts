import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Saved workouts for one class.
 * Includes workouts tagged to the class, workouts already on its calendar,
 * and unscheduled workouts made by a coach of the class that are not on another class.
 */
export function classSavedWorkoutWhere(
  schoolId: string,
  classId: string,
  coachUserIds: string[]
): Prisma.WorkoutTemplateWhereInput {
  const unscheduledByClassCoach: Prisma.WorkoutTemplateWhereInput | null =
    coachUserIds.length > 0
      ? {
          classId: null,
          createdById: { in: coachUserIds },
          assignments: { none: { classId: { not: classId } } },
        }
      : null;

  return {
    schoolId,
    archivedAt: null,
    OR: [
      { classId },
      { assignments: { some: { classId } } },
      ...(unscheduledByClassCoach ? [unscheduledByClassCoach] : []),
    ],
  };
}

const savedWorkoutInclude = {
  exercises: {
    orderBy: { sortOrder: "asc" as const },
    include: { activity: { select: { slug: true, name: true } } },
  },
  createdBy: { select: { firstName: true, lastName: true } },
  _count: { select: { assignments: true } },
} satisfies Prisma.WorkoutTemplateInclude;

export function savedWorkoutCreatorName(
  user: { firstName: string; lastName: string } | null | undefined
): string | null {
  if (!user) return null;
  const name = `${user.firstName} ${user.lastName}`.trim();
  return name || null;
}

export async function listClassSavedWorkouts(schoolId: string, classId: string) {
  const cls = await prisma.class.findFirst({
    where: { id: classId, schoolId },
    select: {
      coach: { select: { userId: true } },
      coachAssignments: { select: { coach: { select: { userId: true } } } },
    },
  });
  if (!cls) return [];
  const coachUserIds = [
    ...new Set(
      [cls.coach?.userId, ...cls.coachAssignments.map((row) => row.coach.userId)].filter(
        (id): id is string => Boolean(id)
      )
    ),
  ];
  return prisma.workoutTemplate.findMany({
    where: classSavedWorkoutWhere(schoolId, classId, coachUserIds),
    orderBy: { updatedAt: "desc" },
    include: savedWorkoutInclude,
  });
}

export async function coachSharesSavedWorkout(
  userId: string,
  schoolId: string,
  template: { id: string; classId: string | null }
): Promise<boolean> {
  const profile = await prisma.coachProfile.findFirst({
    where: { userId, schoolId },
    select: { id: true },
  });
  if (!profile) return false;
  const classes = await prisma.class.findMany({
    where: {
      schoolId,
      OR: [{ coachId: profile.id }, { coachAssignments: { some: { coachId: profile.id } } }],
    },
    select: { id: true },
  });
  const mine = new Set(classes.map((row) => row.id));
  if (template.classId && mine.has(template.classId)) return true;
  const assignments = await prisma.workoutAssignment.findMany({
    where: { templateId: template.id, classId: { not: null } },
    select: { classId: true },
  });
  return assignments.some((row) => row.classId != null && mine.has(row.classId));
}
