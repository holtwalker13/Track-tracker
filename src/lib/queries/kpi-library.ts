import { prisma } from "@/lib/db";

export type KpiLibraryActivity = {
  slug: string;
  name: string;
  unit: string;
  categorySlug: string;
  /** true = coach-built school KPI; false = global catalog */
  custom: boolean;
};

/**
 * Every KPI-eligible activity for a school: the full testing-metric catalog
 * (speed, power, agility, flexibility, …) plus the workout-program lift
 * library (strength) and any coach-built custom KPIs. Body metrics
 * (height/weight) and KPIs/lifts the school hid are excluded.
 */
export async function listSchoolKpiLibrary(schoolId: string): Promise<KpiLibraryActivity[]> {
  const [hiddenKpis, hiddenLifts] = await Promise.all([
    prisma.schoolHiddenKpi.findMany({
      where: { schoolId },
      select: { metricSlug: true },
    }),
    prisma.schoolHiddenLift.findMany({
      where: { schoolId },
      select: { activitySlug: true },
    }),
  ]);
  const hidden = new Set([
    ...hiddenKpis.map((h) => h.metricSlug),
    ...hiddenLifts.map((h) => h.activitySlug),
  ]);

  const activities = await prisma.activity.findMany({
    where: {
      OR: [{ schoolId: null }, { schoolId }],
      slug: { notIn: ["height", "weight"] },
      category: { isNot: { slug: "body" } },
    },
    include: { category: { select: { slug: true } } },
    orderBy: { name: "asc" },
  });

  return activities
    .filter((a) => !hidden.has(a.slug))
    .map((a) => ({
      slug: a.slug,
      name: a.name,
      unit: a.unit,
      categorySlug: a.category.slug,
      custom: a.schoolId != null,
    }));
}
