import { prisma } from "@/lib/db";
import { listSchoolLifts } from "@/lib/queries/lifts";

export function pickEffectiveOneRepMaxForWorkouts(
  testedLb: number | null,
  coreLb: number | null
): { value: number | null; source: "tested" | "core" | null } {
  if (testedLb != null && testedLb > 0) return { value: testedLb, source: "tested" };
  if (coreLb != null && coreLb > 0) return { value: coreLb, source: "core" };
  return { value: null, source: null };
}

export type CoreOneRepMaxRow = {
  slug: string;
  name: string;
  unit: string;
  coreLb: number | null;
  testedLb: number | null;
  effectiveLb: number | null;
  source: "tested" | "core" | null;
};

async function bestTestedOneRepMax(studentId: string, activityId: string): Promise<number | null> {
  const best = await prisma.performanceResult.findFirst({
    where: {
      studentId,
      activityId,
      status: { not: "SUPERSEDED" },
      isBestAttempt: true,
      resultValue: { not: null },
    },
    orderBy: { resultValue: "desc" },
    select: { resultValue: true },
  });
  return best?.resultValue != null && best.resultValue > 0 ? best.resultValue : null;
}

/** Tested mark wins; otherwise the coach’s core starting point. */
export async function resolveStudentLiftOneRepMax(
  studentId: string,
  activitySlug: string
): Promise<{ value: number | null; source: "tested" | "core" | null }> {
  const activity = await prisma.activity.findUnique({
    where: { slug: activitySlug },
    select: { id: true, unit: true },
  });
  if (!activity || activity.unit !== "lb") {
    return { value: null, source: null };
  }

  const tested = await bestTestedOneRepMax(studentId, activity.id);
  const core = await prisma.studentCoreOneRepMax.findUnique({
    where: { studentId_activityId: { studentId, activityId: activity.id } },
    select: { valueLb: true },
  });
  return pickEffectiveOneRepMaxForWorkouts(tested, core?.valueLb ?? null);
}

export async function listStudentCoreOneRepMaxRows(
  schoolId: string,
  studentId: string
): Promise<CoreOneRepMaxRow[]> {
  const lifts = (await listSchoolLifts(schoolId)).filter((lift) => lift.unit === "lb");
  if (lifts.length === 0) return [];

  const activities = await prisma.activity.findMany({
    where: { slug: { in: lifts.map((lift) => lift.slug) } },
    select: { id: true, slug: true },
  });
  const idBySlug = new Map(activities.map((activity) => [activity.slug, activity.id]));

  const cores = await prisma.studentCoreOneRepMax.findMany({
    where: { studentId, activityId: { in: activities.map((activity) => activity.id) } },
    select: { activityId: true, valueLb: true },
  });
  const coreByActivityId = new Map(cores.map((row) => [row.activityId, row.valueLb]));

  const rows: CoreOneRepMaxRow[] = [];
  for (const lift of lifts) {
    const activityId = idBySlug.get(lift.slug);
    if (!activityId) continue;
    const tested = await bestTestedOneRepMax(studentId, activityId);
    const coreLb = coreByActivityId.get(activityId) ?? null;
    const effectiveLb = tested ?? (coreLb != null && coreLb > 0 ? coreLb : null);
    rows.push({
      slug: lift.slug,
      name: lift.name,
      unit: lift.unit,
      coreLb,
      testedLb: tested,
      effectiveLb,
      source: tested != null ? "tested" : coreLb != null && coreLb > 0 ? "core" : null,
    });
  }
  return rows;
}

export async function saveStudentCoreOneRepMaxes(
  studentId: string,
  updates: { slug: string; valueLb: number | null }[]
) {
  for (const row of updates) {
    const activity = await prisma.activity.findUnique({
      where: { slug: row.slug },
      select: { id: true, unit: true },
    });
    if (!activity || activity.unit !== "lb") continue;

    if (row.valueLb == null || row.valueLb <= 0) {
      await prisma.studentCoreOneRepMax.deleteMany({
        where: { studentId, activityId: activity.id },
      });
      continue;
    }

    await prisma.studentCoreOneRepMax.upsert({
      where: { studentId_activityId: { studentId, activityId: activity.id } },
      create: { studentId, activityId: activity.id, valueLb: row.valueLb },
      update: { valueLb: row.valueLb },
    });
  }
}
