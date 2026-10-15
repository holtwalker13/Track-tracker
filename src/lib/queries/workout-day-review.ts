import { prisma } from "@/lib/db";
import { formatActivityValue } from "@/lib/format";
import { studentsTargetedByWorkoutAssignment } from "@/lib/queries/workout-assignment-roster";
import { deriveWorkoutPerformanceValue } from "@/lib/services/workout-performance-sync";
import { epleyE1rm } from "@/lib/services/workout-progression";
import { coachFacingWorkoutStatus, dayBoundsFromDateString } from "@/lib/services/workouts";

export type DayReviewSet = {
  setNumber: number;
  weightLb: number | null;
  reps: number | null;
  skipped: boolean;
};

export type DayLiftComparison = {
  value: number | null;
  previous: number | null;
  delta: number | null;
  improved: boolean;
  isFirst: boolean;
};

/** Projected mark for one athlete on one lift, compared with their previous best. */
export function compareLiftMark(current: number | null, previous: number | null): DayLiftComparison {
  if (current == null) {
    return { value: null, previous, delta: null, improved: false, isFirst: false };
  }
  if (previous == null) {
    return { value: current, previous: null, delta: null, improved: false, isFirst: true };
  }
  const delta = Math.round((current - previous) * 10) / 10;
  return {
    value: current,
    previous,
    delta,
    improved: delta > 0,
    isFirst: false,
  };
}

export function dayLiftValue(unit: string, sets: DayReviewSet[]): number | null {
  return deriveWorkoutPerformanceValue({ slug: "", unit }, sets);
}

/** Weight × reps (or reps) for the set that produced the day's projected mark. */
export function bestSetLabel(unit: string, sets: DayReviewSet[]): string | null {
  const usable = sets.filter((s) => !s.skipped && s.reps != null && s.reps > 0);
  if (usable.length === 0) return null;
  if (unit === "reps") {
    const best = Math.max(...usable.map((s) => s.reps!));
    return `${best} reps`;
  }
  let best: DayReviewSet | null = null;
  let bestE = 0;
  for (const set of usable) {
    const weight = set.weightLb ?? 0;
    if (weight <= 0) continue;
    const projected = epleyE1rm(weight, set.reps!);
    if (projected > bestE) {
      bestE = projected;
      best = set;
    }
  }
  if (!best || best.weightLb == null || best.reps == null) return null;
  return `${Math.round(best.weightLb)}×${best.reps}`;
}

export type RankedImprovement = {
  studentId: string;
  name: string;
  delta: number;
  standout: boolean;
};

/** Largest gains stand out. Tied leaders stand out only when someone improved less. */
export function rankImprovements(
  rows: { studentId: string; name: string; delta: number }[]
): RankedImprovement[] {
  const sorted = [...rows].filter((row) => row.delta > 0).sort((a, b) => b.delta - a.delta);
  const top = sorted[0]?.delta ?? 0;
  const hasSmaller = sorted.some((row) => row.delta < top);
  return sorted.map((row) => ({
    ...row,
    standout: hasSmaller && row.delta === top,
  }));
}

export type WorkoutDayLift = {
  exerciseId: string;
  slug: string;
  name: string;
  unit: string;
};

export type WorkoutDayCell = DayLiftComparison & {
  display: string;
  previousDisplay: string | null;
  deltaDisplay: string | null;
  bestSet: string | null;
};

export type WorkoutDayAthlete = {
  studentId: string;
  name: string;
  studentNumber: string;
  provisional: boolean;
  sessionId: string | null;
  status: string;
  cells: Record<string, WorkoutDayCell>;
};

export type WorkoutDayLiftSummary = {
  exerciseId: string;
  name: string;
  unit: string;
  loggedCount: number;
  improved: {
    studentId: string;
    name: string;
    delta: number;
    deltaDisplay: string;
    fromDisplay: string;
    toDisplay: string;
    standout: boolean;
    sessionId: string | null;
  }[];
};

export type WorkoutDayAssignmentReview = {
  assignmentId: string;
  templateName: string;
  lifts: WorkoutDayLift[];
  athletes: WorkoutDayAthlete[];
  summaries: WorkoutDayLiftSummary[];
  rosterCount: number;
  completedCount: number;
};

export type WorkoutDayReview = {
  date: string;
  assignments: WorkoutDayAssignmentReview[];
};

function cellFor(unit: string, sets: DayReviewSet[], previous: number | null): WorkoutDayCell {
  const value = dayLiftValue(unit, sets);
  const compared = compareLiftMark(value, previous);
  const display = value == null ? "—" : formatActivityValue(value, unit);
  const previousDisplay = previous == null ? null : formatActivityValue(previous, unit);
  const deltaDisplay =
    compared.delta == null || compared.delta === 0
      ? null
      : `${compared.delta > 0 ? "+" : "−"}${formatActivityValue(Math.abs(compared.delta), unit)}`;
  return {
    ...compared,
    display,
    previousDisplay,
    deltaDisplay,
    bestSet: bestSetLabel(unit, sets),
  };
}

function summaryFor(
  lift: WorkoutDayLift,
  athletes: WorkoutDayAthlete[]
): WorkoutDayLiftSummary {
  const improvedRows = athletes.flatMap((athlete) => {
    const cell = athlete.cells[lift.exerciseId];
    if (!cell?.improved || cell.delta == null || cell.delta <= 0) return [];
    return [
      {
        studentId: athlete.studentId,
        name: athlete.name,
        delta: cell.delta,
        sessionId: athlete.sessionId,
        fromDisplay: cell.previousDisplay ?? "—",
        toDisplay: cell.display,
      },
    ];
  });
  const ranked = rankImprovements(improvedRows);
  const byId = new Map(improvedRows.map((row) => [row.studentId, row]));
  return {
    exerciseId: lift.exerciseId,
    name: lift.name,
    unit: lift.unit,
    loggedCount: athletes.filter((athlete) => athlete.cells[lift.exerciseId]?.value != null).length,
    improved: ranked.map((row) => {
      const detail = byId.get(row.studentId)!;
      return {
        studentId: row.studentId,
        name: row.name,
        delta: row.delta,
        deltaDisplay: `+${formatActivityValue(row.delta, lift.unit)}`,
        fromDisplay: detail.fromDisplay,
        toDisplay: detail.toDisplay,
        standout: row.standout,
        sessionId: detail.sessionId,
      };
    }),
  };
}

export async function getClassWorkoutDayReview(input: {
  schoolId: string;
  classId: string;
  date: string;
  subgroupId?: string;
  assignmentId?: string;
}): Promise<WorkoutDayReview> {
  const bounds = dayBoundsFromDateString(input.date);
  if (!bounds) return { date: input.date, assignments: [] };

  const assignments = await prisma.workoutAssignment.findMany({
    where: {
      schoolId: input.schoolId,
      classId: input.classId,
      ...(input.assignmentId ? { id: input.assignmentId } : {}),
      scheduledDate: { gte: bounds.start, lte: bounds.end },
    },
    include: {
      template: {
        select: {
          name: true,
          exercises: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              activity: { select: { slug: true, name: true, unit: true } },
            },
          },
        },
      },
      sessions: {
        select: {
          id: true,
          studentId: true,
          status: true,
          setLogs: {
            select: {
              templateExerciseId: true,
              setNumber: true,
              weightLb: true,
              reps: true,
              skipped: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  let subgroupMemberIds: Set<string> | null = null;
  if (input.subgroupId) {
    const members = await prisma.classSubgroupMember.findMany({
      where: { subgroupId: input.subgroupId },
      select: { studentId: true },
    });
    subgroupMemberIds = new Set(members.map((member) => member.studentId));
  }

  const reviews: WorkoutDayAssignmentReview[] = [];

  for (const assignment of assignments) {
    const targeted = await studentsTargetedByWorkoutAssignment({
      assignmentId: assignment.id,
      classId: assignment.classId,
      subgroupId: assignment.subgroupId,
      studentId: assignment.studentId,
    });
    const athletesSource = subgroupMemberIds
      ? targeted.filter((student) => subgroupMemberIds.has(student.id))
      : targeted;
    const lifts: WorkoutDayLift[] = assignment.template.exercises.map((exercise) => ({
      exerciseId: exercise.id,
      slug: exercise.activity.slug,
      name: exercise.activity.name,
      unit: exercise.activity.unit,
    }));
    const activities = await prisma.activity.findMany({
      where: { slug: { in: lifts.map((lift) => lift.slug) } },
      select: { id: true, slug: true },
    });
    const slugToActivityId = new Map(activities.map((activity) => [activity.slug, activity.id]));

    const studentIds = athletesSource.map((student) => student.id);
    const previousRows =
      studentIds.length === 0 || activities.length === 0
        ? []
        : await prisma.performanceResult.findMany({
            where: {
              studentId: { in: studentIds },
              activityId: { in: activities.map((activity) => activity.id) },
              status: "COMPLETED",
              resultValue: { not: null },
              testingDate: { lt: bounds.start },
            },
            select: { studentId: true, activityId: true, resultValue: true },
          });
    const previousBest = new Map<string, number>();
    for (const row of previousRows) {
      if (row.resultValue == null) continue;
      const key = `${row.studentId}:${row.activityId}`;
      const current = previousBest.get(key);
      if (current == null || row.resultValue > current) previousBest.set(key, row.resultValue);
    }

    const sessionByStudent = new Map(assignment.sessions.map((session) => [session.studentId, session]));
    const athletes: WorkoutDayAthlete[] = athletesSource
      .map((student) => {
        const session = sessionByStudent.get(student.id);
        const sets = session?.setLogs ?? [];
        const cells: Record<string, WorkoutDayCell> = {};
        for (const lift of lifts) {
          const liftSets = sets
            .filter((set) => set.templateExerciseId === lift.exerciseId)
            .map((set) => ({
              setNumber: set.setNumber,
              weightLb: set.weightLb,
              reps: set.reps,
              skipped: set.skipped,
            }));
          const activityId = slugToActivityId.get(lift.slug);
          const previous = activityId ? (previousBest.get(`${student.id}:${activityId}`) ?? null) : null;
          cells[lift.exerciseId] = cellFor(lift.unit, liftSets, previous);
        }
        const setLogCount = sets.filter((set) => !set.skipped && (set.reps != null || set.weightLb != null)).length;
        return {
          studentId: student.id,
          name: `${student.firstName} ${student.lastName}`,
          studentNumber: student.studentNumber,
          provisional: student.provisional,
          sessionId: session?.id ?? null,
          status: coachFacingWorkoutStatus(session?.status ?? "NOT_STARTED", setLogCount),
          cells,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    reviews.push({
      assignmentId: assignment.id,
      templateName: assignment.template.name,
      lifts,
      athletes,
      summaries: lifts.map((lift) => summaryFor(lift, athletes)),
      rosterCount: athletes.length,
      completedCount: athletes.filter((athlete) => athlete.status === "COMPLETED").length,
    });
  }

  return { date: input.date, assignments: reviews };
}
