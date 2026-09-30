import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { LIFTING_WORKOUT_SLUGS } from "@/lib/lifting";
import { deriveWorkoutPerformanceValue } from "@/lib/services/workout-performance-sync";
import { calculatePersonalRecord } from "@/lib/services/performance";
import type { ScoringDirection } from "@/lib/constants";
import {
  assignmentsInWeek,
  getStudentAssignmentCompletionRows,
  weekKeyForDate,
} from "@/lib/gamification/assignments";
import {
  CLUB_LIFT_SLUGS,
  STATIC_ACCOLADES,
} from "@/lib/gamification/accolade-definitions";
import {
  currentWorkoutStreak,
  longestWorkoutStreak,
} from "@/lib/gamification/streaks";
import { gamificationSourceKeys } from "@/lib/gamification/source-keys";
import {
  XP,
  XP_REASON_LABELS,
  type XpReason,
  levelProgress,
} from "@/lib/gamification/xp";

export type XpAwardLine = {
  amount: number;
  reason: XpReason;
  label: string;
};

export type AccoladeUnlockLine = {
  slug: string;
  name: string;
  emoji: string;
  description: string;
};

export type WorkoutGamificationResult = {
  xpLines: XpAwardLine[];
  totalXpToday: number;
  newAccolades: AccoladeUnlockLine[];
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  lifetimeXp: number;
};

async function ensureGamificationProfile(studentId: string) {
  return prisma.studentGamification.upsert({
    where: { studentId },
    create: { studentId },
    update: {},
  });
}

async function awardXp(
  studentId: string,
  reason: XpReason,
  sourceKey: string,
  metadata?: Prisma.InputJsonValue
): Promise<XpAwardLine | null> {
  const amount = XP[reason];
  try {
    await prisma.$transaction(async (tx) => {
      await tx.xpTransaction.create({
        data: {
          studentId,
          amount,
          reason,
          sourceKey,
          metadata: metadata ?? undefined,
        },
      });
      await tx.studentGamification.upsert({
        where: { studentId },
        create: { studentId, lifetimeXp: amount },
        update: { lifetimeXp: { increment: amount } },
      });
    });
    return { amount, reason, label: XP_REASON_LABELS[reason] };
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return null;
    }
    throw err;
  }
}

function sessionAllSetsCompleted(session: {
  setLogs: { templateExerciseId: string; setNumber: number; skipped: boolean }[];
  assignment: {
    template: {
      exercises: { id: string; defaultSets: number }[];
    };
  };
}): boolean {
  for (const ex of session.assignment.template.exercises) {
    for (let n = 1; n <= ex.defaultSets; n++) {
      const log = session.setLogs.find(
        (l) => l.templateExerciseId === ex.id && l.setNumber === n
      );
      if (!log || log.skipped) return false;
    }
  }
  return true;
}

const MAJOR_WORKOUT_MILESTONES = [10, 25, 50, 100] as const;

const WORKOUT_SESSION_NOTES_PREFIX = "workoutSession:";

async function getPriorWorkoutSessionBest(
  studentId: string,
  activityId: string,
  excludeSessionId: string
): Promise<number | null> {
  const priorSessions = await prisma.workoutSession.findMany({
    where: {
      studentId,
      status: "COMPLETED",
      id: { not: excludeSessionId },
      setLogs: {
        some: {
          skipped: false,
          templateExercise: { activityId },
        },
      },
    },
    orderBy: { completedAt: "desc" },
    take: 1,
    include: {
      setLogs: {
        where: { skipped: false, templateExercise: { activityId } },
        include: { templateExercise: { include: { activity: true } } },
      },
    },
  });

  const session = priorSessions[0];
  if (!session) return null;
  const act = session.setLogs[0]?.templateExercise.activity;
  if (!act) return null;
  return deriveWorkoutPerformanceValue(act, session.setLogs);
}

export async function syncStudentStreaks(studentId: string): Promise<void> {
  const rows = await getStudentAssignmentCompletionRows(studentId);
  const current = currentWorkoutStreak(rows);
  const longest = longestWorkoutStreak(rows);
  await prisma.studentGamification.upsert({
    where: { studentId },
    create: {
      studentId,
      currentStreak: current,
      longestStreak: longest,
    },
    update: {
      currentStreak: current,
      longestStreak: longest,
    },
  });
}

export async function evaluateStaticAccolades(
  studentId: string
): Promise<AccoladeUnlockLine[]> {
  const defs = await prisma.accoladeDefinition.findMany({
    where: { kind: "STATIC" },
  });
  const defBySlug = new Map(defs.map((d) => [d.slug, d]));

  const rows = await getStudentAssignmentCompletionRows(studentId);
  const completedCount = rows.filter((r) => r.completed).length;
  const streak = currentWorkoutStreak(rows);

  const prCount = await prisma.performanceResult.count({
    where: {
      studentId,
      isPersonalRecord: true,
      status: "COMPLETED",
    },
  });

  const improvedLiftSlugs = await prisma.xpTransaction.findMany({
    where: {
      studentId,
      reason: "LIFT_IMPROVED",
    },
    select: { metadata: true },
  });
  const improvedLiftSet = new Set<string>();
  for (const tx of improvedLiftSlugs) {
    const slug = (tx.metadata as { activitySlug?: string } | null)?.activitySlug;
    if (slug) improvedLiftSet.add(slug);
  }

  const clubTotals = await getClubLiftTotal(studentId);

  const perfectWeekEarned = await prisma.studentAccolade.findFirst({
    where: {
      studentId,
      accolade: { slug: "perfect-week" },
    },
  });

  const checks: { slug: string; met: boolean; metadata?: Prisma.InputJsonValue }[] = [
    { slug: "on-fire", met: streak >= 10, metadata: { streak } },
    { slug: "unstoppable", met: streak >= 25, metadata: { streak } },
    { slug: "perfect-week", met: perfectWeekEarned != null },
    { slug: "first-pr", met: prCount >= 1, metadata: { prCount } },
    { slug: "pr-machine", met: prCount >= 10, metadata: { prCount } },
    {
      slug: "breakthrough",
      met: improvedLiftSet.size >= 3,
      metadata: { lifts: [...improvedLiftSet] },
    },
    { slug: "club-500", met: clubTotals >= 500, metadata: { totalLb: clubTotals } },
    { slug: "club-750", met: clubTotals >= 750, metadata: { totalLb: clubTotals } },
    { slug: "club-1000", met: clubTotals >= 1000, metadata: { totalLb: clubTotals } },
    { slug: "workouts-25", met: completedCount >= 25, metadata: { completedCount } },
    { slug: "workouts-50", met: completedCount >= 50, metadata: { completedCount } },
    { slug: "workouts-100", met: completedCount >= 100, metadata: { completedCount } },
  ];

  const unlocked: AccoladeUnlockLine[] = [];

  for (const check of checks) {
    if (!check.met) continue;
    const def = defBySlug.get(check.slug);
    if (!def) continue;

    try {
      await prisma.studentAccolade.create({
        data: {
          studentId,
          accoladeId: def.id,
          metadata: check.metadata ?? undefined,
        },
      });
      unlocked.push({
        slug: def.slug,
        name: def.name,
        emoji: def.emoji,
        description: def.description,
      });
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        continue;
      }
      throw err;
    }
  }

  return unlocked;
}

export async function getClubLiftTotal(studentId: string): Promise<number> {
  let total = 0;
  for (const slug of CLUB_LIFT_SLUGS) {
    const activity = await prisma.activity.findFirst({
      where: { slug, schoolId: null },
    });
    if (!activity) continue;
    const best = await prisma.performanceResult.findFirst({
      where: {
        studentId,
        activityId: activity.id,
        status: "COMPLETED",
        isBestAttempt: true,
        resultValue: { not: null },
      },
      orderBy: { resultValue: "desc" },
    });
    if (best?.resultValue != null) total += best.resultValue;
  }
  return Math.round(total);
}

async function maybeAwardPerfectWeek(
  studentId: string,
  weekKey: string
): Promise<XpAwardLine | null> {
  const rows = await getStudentAssignmentCompletionRows(studentId);
  const inWeek = assignmentsInWeek(rows, weekKey);
  if (inWeek.length === 0) return null;
  if (!inWeek.every((r) => r.completed)) return null;

  const xpLine = await awardXp(
    studentId,
    "PERFECT_TRAINING_WEEK",
    gamificationSourceKeys.perfectWeek(studentId, weekKey)
  );

  if (xpLine) {
    const def = await prisma.accoladeDefinition.findUnique({
      where: { slug: "perfect-week" },
    });
    if (def) {
      try {
        await prisma.studentAccolade.create({
          data: {
            studentId,
            accoladeId: def.id,
            metadata: { weekKey },
          },
        });
      } catch (err: unknown) {
        if (
          !(
            err &&
            typeof err === "object" &&
            "code" in err &&
            (err as { code: string }).code === "P2002"
          )
        ) {
          throw err;
        }
      }
    }
  }

  return xpLine;
}

export async function processWorkoutGamification(
  sessionId: string
): Promise<WorkoutGamificationResult> {
  const workoutSession = await prisma.workoutSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: {
      student: true,
      setLogs: true,
      assignment: {
        include: {
          template: {
            include: {
              exercises: { include: { activity: true } },
            },
          },
        },
      },
    },
  });

  const studentId = workoutSession.studentId;
  await ensureGamificationProfile(studentId);

  const xpLines: XpAwardLine[] = [];

  const completeLine = await awardXp(
    studentId,
    "WORKOUT_COMPLETE",
    gamificationSourceKeys.workoutComplete(sessionId)
  );
  if (completeLine) xpLines.push(completeLine);

  if (sessionAllSetsCompleted(workoutSession)) {
    const allSetsLine = await awardXp(
      studentId,
      "ALL_SETS_COMPLETE",
      gamificationSourceKeys.allSets(sessionId)
    );
    if (allSetsLine) xpLines.push(allSetsLine);
  }

  for (const exercise of workoutSession.assignment.template.exercises) {
    const activity = exercise.activity;
    if (!LIFTING_WORKOUT_SLUGS.includes(activity.slug as (typeof LIFTING_WORKOUT_SLUGS)[number])) {
      continue;
    }
    const logsForExercise = workoutSession.setLogs.filter(
      (l) => l.templateExerciseId === exercise.id
    );
    const value = deriveWorkoutPerformanceValue(activity, logsForExercise);
    if (value == null) continue;

    const direction = activity.scoringDirection as ScoringDirection;
    const workoutMark = await prisma.performanceResult.findFirst({
      where: {
        studentId,
        activityId: activity.id,
        notes: `${WORKOUT_SESSION_NOTES_PREFIX}${sessionId}`,
        entryMethod: "WORKOUT",
      },
    });
    const isPr = workoutMark?.isPersonalRecord ?? false;

    if (isPr) {
      const prLine = await awardXp(
        studentId,
        "NEW_PR",
        gamificationSourceKeys.pr(sessionId, activity.id),
        {
        activitySlug: activity.slug,
        activityName: activity.name,
        value,
        }
      );
      if (prLine) {
        xpLines.push({
          ...prLine,
          label: `New ${activity.name} PR`,
        });
      }
    } else {
      const priorSessionBest = await getPriorWorkoutSessionBest(
        studentId,
        activity.id,
        sessionId
      );
      if (
        priorSessionBest != null &&
        calculatePersonalRecord(value, priorSessionBest, direction)
      ) {
        const impLine = await awardXp(
          studentId,
          "LIFT_IMPROVED",
          gamificationSourceKeys.liftImproved(sessionId, activity.id),
          { activitySlug: activity.slug, activityName: activity.name, value }
        );
        if (impLine) {
          xpLines.push({
            ...impLine,
            label: `${activity.name} Improved`,
          });
        }
      }
    }
  }

  const weekKey = weekKeyForDate(workoutSession.assignment.scheduledDate);
  const perfectWeekLine = await maybeAwardPerfectWeek(studentId, weekKey);
  if (perfectWeekLine) xpLines.push(perfectWeekLine);

  const rows = await getStudentAssignmentCompletionRows(studentId);
  const completedCount = rows.filter((r) => r.completed).length;
  for (const milestone of MAJOR_WORKOUT_MILESTONES) {
    if (completedCount >= milestone) {
      const line = await awardXp(
        studentId,
        "MAJOR_MILESTONE",
        gamificationSourceKeys.milestoneWorkouts(studentId, milestone),
        { workoutCount: milestone }
      );
      if (line) {
        xpLines.push({
          ...line,
          label: `${milestone} Workouts Milestone`,
        });
      }
    }
  }

  await syncStudentStreaks(studentId);
  const newAccolades = await evaluateStaticAccolades(studentId);

  const profile = await prisma.studentGamification.findUniqueOrThrow({
    where: { studentId },
  });
  const progress = levelProgress(profile.lifetimeXp);

  return {
    xpLines,
    totalXpToday: xpLines.reduce((s, l) => s + l.amount, 0),
    newAccolades,
    ...progress,
    lifetimeXp: profile.lifetimeXp,
  };
}

/** Idempotent full recompute: streaks + static accolades (no duplicate XP). */
export async function recalculateStudentGamification(studentId: string): Promise<void> {
  await ensureGamificationProfile(studentId);
  const sum = await prisma.xpTransaction.aggregate({
    where: { studentId },
    _sum: { amount: true },
  });
  await prisma.studentGamification.update({
    where: { studentId },
    data: { lifetimeXp: sum._sum.amount ?? 0 },
  });
  await syncStudentStreaks(studentId);
  await evaluateStaticAccolades(studentId);
}

export type AccoladeProgress = {
  slug: string;
  name: string;
  emoji: string;
  description: string;
  category: string;
  earned: boolean;
  earnedAt?: Date;
  progressLabel?: string;
  progressCurrent?: number;
  progressTarget?: number;
};

export async function getAccoladeProgressForStudent(
  studentId: string
): Promise<AccoladeProgress[]> {
  const defs = await prisma.accoladeDefinition.findMany({
    where: { kind: "STATIC" },
    orderBy: { sortOrder: "asc" },
  });
  const earned = await prisma.studentAccolade.findMany({
    where: { studentId },
    include: { accolade: true },
  });
  const earnedBySlug = new Map(earned.map((e) => [e.accolade.slug, e]));

  const rows = await getStudentAssignmentCompletionRows(studentId);
  const completedCount = rows.filter((r) => r.completed).length;
  const streak = currentWorkoutStreak(rows);
  const prCount = await prisma.performanceResult.count({
    where: { studentId, isPersonalRecord: true, status: "COMPLETED" },
  });
  const improvedLiftSlugs = await prisma.xpTransaction.findMany({
    where: { studentId, reason: "LIFT_IMPROVED" },
    select: { metadata: true },
  });
  const improvedCount = new Set(
    improvedLiftSlugs
      .map((t) => (t.metadata as { activitySlug?: string } | null)?.activitySlug)
      .filter(Boolean)
  ).size;
  const clubTotal = await getClubLiftTotal(studentId);

  return defs.map((def) => {
    const seed = STATIC_ACCOLADES.find((s) => s.slug === def.slug);
    const config = (seed?.config ?? {}) as Record<string, number>;
    const row = earnedBySlug.get(def.slug);
    let progressCurrent: number | undefined;
    let progressTarget: number | undefined;
    let progressLabel: string | undefined;

    switch (def.slug) {
      case "on-fire":
      case "unstoppable":
        progressCurrent = streak;
        progressTarget = config.streakMin;
        progressLabel = `${streak} / ${progressTarget} workout streak`;
        break;
      case "pr-machine":
        progressCurrent = prCount;
        progressTarget = config.prCountMin;
        progressLabel = `${prCount} / ${progressTarget} PRs`;
        break;
      case "breakthrough":
        progressCurrent = improvedCount;
        progressTarget = config.improvedLiftCountMin ?? 3;
        progressLabel = `${progressCurrent} / ${progressTarget} lifts improved`;
        break;
      case "club-500":
      case "club-750":
      case "club-1000":
        progressCurrent = clubTotal;
        progressTarget = config.totalLbMin;
        progressLabel = `${clubTotal} / ${progressTarget} lbs`;
        break;
      case "workouts-25":
      case "workouts-50":
      case "workouts-100":
        progressCurrent = completedCount;
        progressTarget = config.workoutCountMin;
        progressLabel = `${completedCount} / ${progressTarget} workouts`;
        break;
      case "first-pr":
        progressCurrent = prCount;
        progressTarget = 1;
        progressLabel = prCount >= 1 ? "Earned" : "0 / 1 PR";
        break;
      default:
        break;
    }

    return {
      slug: def.slug,
      name: def.name,
      emoji: def.emoji,
      description: def.description,
      category: def.category,
      earned: row != null,
      earnedAt: row?.earnedAt,
      progressLabel,
      progressCurrent,
      progressTarget,
    };
  });
}

export async function getXpLeaderboard(
  schoolId: string,
  limit = 25
): Promise<
  { studentId: string; displayName: string; lifetimeXp: number; level: number; rank: number }[]
> {
  const students = await prisma.studentProfile.findMany({
    where: { schoolId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      gamification: { select: { lifetimeXp: true } },
    },
  });

  const sorted = students
    .map((s) => ({
      studentId: s.id,
      displayName: `${s.firstName} ${s.lastName}`,
      lifetimeXp: s.gamification?.lifetimeXp ?? 0,
      level: levelProgress(s.gamification?.lifetimeXp ?? 0).level,
    }))
    .filter((s) => s.lifetimeXp > 0)
    .sort((a, b) => b.lifetimeXp - a.lifetimeXp)
    .slice(0, limit);

  return sorted.map((row, i) => ({ ...row, rank: i + 1 }));
}
