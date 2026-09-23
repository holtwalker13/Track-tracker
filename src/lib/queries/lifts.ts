import { prisma } from "@/lib/db";
import { LIFTING_SESSION_SLUGS } from "@/lib/lifting";

export type SchoolLiftRow = {
  slug: string;
  name: string;
  unit: string;
  custom: boolean;
  /** Suitable for set/rep workout programs (lb or reps, not × BW). */
  forWorkouts: boolean;
};

const WORKOUT_UNITS = new Set(["lb", "reps"]);

/** Default catalog order for seeded strength lifts. */
const DEFAULT_ORDER = new Map(LIFTING_SESSION_SLUGS.map((s, i) => [s, i]));

export async function listSchoolLifts(schoolId: string): Promise<SchoolLiftRow[]> {
  const hidden = await prisma.schoolHiddenLift.findMany({
    where: { schoolId },
    select: { activitySlug: true },
  });
  const hiddenSet = new Set(hidden.map((h) => h.activitySlug));

  const activities = await prisma.activity.findMany({
    where: {
      category: { slug: "strength" },
      OR: [{ schoolId: null }, { schoolId }],
    },
    include: { category: true },
    orderBy: { name: "asc" },
  });

  const rows: SchoolLiftRow[] = activities
    .filter((a) => !hiddenSet.has(a.slug))
    .map((a) => ({
      slug: a.slug,
      name: a.name,
      unit: a.unit,
      custom: a.schoolId != null,
      forWorkouts: WORKOUT_UNITS.has(a.unit),
    }));

  rows.sort((a, b) => {
    const ao = DEFAULT_ORDER.get(a.slug) ?? 999;
    const bo = DEFAULT_ORDER.get(b.slug) ?? 999;
    if (ao !== bo) return ao - bo;
    return a.name.localeCompare(b.name);
  });

  return rows;
}

export function liftsForWorkoutPrograms(lifts: SchoolLiftRow[]) {
  return lifts.filter((l) => l.forWorkouts);
}

export function liftsForTestingSession(lifts: SchoolLiftRow[]) {
  return lifts;
}
