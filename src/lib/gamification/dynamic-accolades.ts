import { prisma } from "@/lib/db";
import { getStudentAssignmentCompletionRows } from "@/lib/gamification/assignments";
import { currentWorkoutStreak } from "@/lib/gamification/streaks";
import { levelProgress } from "@/lib/gamification/xp";
export type DynamicScopeType = "SCHOOL" | "CLASS" | "GRADE";
export type DynamicPeriodType = "WEEK" | "MONTH" | "SEMESTER";

function monthKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function weekPeriodKey(d = new Date()): string {
  const copy = new Date(d);
  copy.setUTCHours(12, 0, 0, 0);
  const day = copy.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  copy.setUTCDate(copy.getUTCDate() - diffToMonday);
  return copy.toISOString().slice(0, 10);
}

async function semesterKeyForSchool(schoolId: string): Promise<string> {
  const sy = await prisma.schoolYear.findFirst({
    where: { schoolId, isCurrent: true },
    select: { id: true },
  });
  return sy?.id ?? "default-semester";
}

async function upsertDynamicHolder(input: {
  accoladeSlug: string;
  studentId: string;
  scopeType: DynamicScopeType;
  scopeId: string;
  periodType: DynamicPeriodType;
  periodKey: string;
  value: number;
}) {
  await prisma.dynamicAccoladeHolder.upsert({
    where: {
      accoladeSlug_scopeType_scopeId_periodType_periodKey: {
        accoladeSlug: input.accoladeSlug,
        scopeType: input.scopeType,
        scopeId: input.scopeId,
        periodType: input.periodType,
        periodKey: input.periodKey,
      },
    },
    create: input,
    update: {
      studentId: input.studentId,
      value: input.value,
      computedAt: new Date(),
    },
  });
}

export async function recomputeSchoolDynamicAccolades(
  schoolId: string,
  periodType: DynamicPeriodType = "SEMESTER"
): Promise<void> {
  const students = await prisma.studentProfile.findMany({
    where: { schoolId },
    select: { id: true },
  });
  const periodKey =
    periodType === "SEMESTER"
      ? await semesterKeyForSchool(schoolId)
      : periodType === "MONTH"
        ? monthKey()
        : weekPeriodKey();

  const semesterStart =
    periodType === "SEMESTER"
      ? (
          await prisma.schoolYear.findFirst({
            where: { schoolId, isCurrent: true },
            select: { startDate: true },
          })
        )?.startDate
      : undefined;

  let bestPr: { studentId: string; count: number } | null = null;
  let bestStreak: { studentId: string; streak: number } | null = null;
  let bestVolume: { studentId: string; volume: number } | null = null;
  let bestImprovement: { studentId: string; pct: number } | null = null;

  for (const { id: studentId } of students) {
    const prWhere = {
      studentId,
      isPersonalRecord: true,
      status: "COMPLETED" as const,
      ...(semesterStart ? { testingDate: { gte: semesterStart } } : {}),
    };
    const prCount = await prisma.performanceResult.count({ where: prWhere });
    if (!bestPr || prCount > bestPr.count) bestPr = { studentId, count: prCount };

    const rows = await getStudentAssignmentCompletionRows(studentId);
    const streak = currentWorkoutStreak(rows);
    if (!bestStreak || streak > bestStreak.streak) {
      bestStreak = { studentId, streak };
    }

    const volume = await prisma.workoutSetLog.aggregate({
      where: {
        skipped: false,
        weightLb: { not: null },
        reps: { not: null },
        session: {
          studentId,
          status: "COMPLETED",
          ...(semesterStart ? { completedAt: { gte: semesterStart } } : {}),
        },
      },
      _sum: { weightLb: true },
    });
    const vol = volume._sum.weightLb ?? 0;
    if (!bestVolume || vol > bestVolume.volume) bestVolume = { studentId, volume: vol };

    const impTx = await prisma.xpTransaction.findMany({
      where: {
        studentId,
        reason: { in: ["LIFT_IMPROVED", "NEW_PR"] },
        ...(semesterStart ? { createdAt: { gte: semesterStart } } : {}),
      },
    });
    const impScore = impTx.length * 5;
    if (!bestImprovement || impScore > bestImprovement.pct) {
      bestImprovement = { studentId, pct: impScore };
    }
  }

  if (bestPr && bestPr.count > 0) {
    await upsertDynamicHolder({
      accoladeSlug: "pr-leader",
      studentId: bestPr.studentId,
      scopeType: "SCHOOL",
      scopeId: schoolId,
      periodType,
      periodKey,
      value: bestPr.count,
    });
  }
  if (bestStreak && bestStreak.streak > 0) {
    await upsertDynamicHolder({
      accoladeSlug: "streak-leader",
      studentId: bestStreak.studentId,
      scopeType: "SCHOOL",
      scopeId: schoolId,
      periodType,
      periodKey,
      value: bestStreak.streak,
    });
  }
  if (bestVolume && bestVolume.volume > 0) {
    await upsertDynamicHolder({
      accoladeSlug: "volume-leader",
      studentId: bestVolume.studentId,
      scopeType: "SCHOOL",
      scopeId: schoolId,
      periodType,
      periodKey,
      value: bestVolume.volume,
    });
  }
  if (bestImprovement && bestImprovement.pct > 0) {
    await upsertDynamicHolder({
      accoladeSlug: "most-improved",
      studentId: bestImprovement.studentId,
      scopeType: "SCHOOL",
      scopeId: schoolId,
      periodType,
      periodKey,
      value: bestImprovement.pct,
    });
  }
}

export async function getStudentDynamicAccolades(studentId: string, schoolId: string) {
  const holders = await prisma.dynamicAccoladeHolder.findMany({
    where: { studentId, scopeId: schoolId },
    orderBy: { computedAt: "desc" },
  });
  const defs = await prisma.accoladeDefinition.findMany({
    where: { slug: { in: holders.map((h) => h.accoladeSlug) } },
  });
  const defBySlug = new Map(defs.map((d) => [d.slug, d]));
  return holders
    .map((h) => {
      const def = defBySlug.get(h.accoladeSlug);
      if (!def) return null;
      return {
        slug: def.slug,
        name: def.name,
        category: def.category,
        description: def.description,
        periodType: h.periodType,
        scopeType: h.scopeType,
        value: h.value,
      };
    })
    .filter(Boolean);
}

export async function getGamificationSummary(studentId: string) {
  const profile = await prisma.studentGamification.findUnique({ where: { studentId } });
  const lifetimeXp = profile?.lifetimeXp ?? 0;
  const progress = levelProgress(lifetimeXp);
  const prCount = await prisma.performanceResult.count({
    where: { studentId, isPersonalRecord: true, status: "COMPLETED" },
  });

  const impCount = await prisma.xpTransaction.count({
    where: { studentId, reason: { in: ["LIFT_IMPROVED", "NEW_PR"] } },
  });
  const improvementPct = Math.min(99, impCount * 3);

  const recentAccolades = await prisma.studentAccolade.findMany({
    where: { studentId },
    include: { accolade: true },
    orderBy: { earnedAt: "desc" },
    take: 5,
  });

  return {
    lifetimeXp,
    ...progress,
    currentStreak: profile?.currentStreak ?? 0,
    longestStreak: profile?.longestStreak ?? 0,
    prCount,
    improvementPct,
    recentAccolades: recentAccolades.map((a) => ({
      slug: a.accolade.slug,
      name: a.accolade.name,
      category: a.accolade.category,
      description: a.accolade.description,
      earnedAt: a.earnedAt,
      metadata: a.metadata,
    })),
  };
}
