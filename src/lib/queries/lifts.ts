import { prisma } from "@/lib/db";
import { DEFAULT_AGE_BRACKET, isAgeBracketId, type AgeBracketId } from "@/lib/age-brackets";
import { LIFTING_SESSION_SLUGS } from "@/lib/lifting";
import { resolveLiftBodyGroup, type LiftBodyGroup } from "@/lib/lift-groups";
import { MEDALS } from "@/lib/kpi-targets";

export type SchoolLiftRow = {
  slug: string;
  name: string;
  unit: string;
  custom: boolean;
  bodyGroup: LiftBodyGroup;
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
    select: { slug: true, name: true, unit: true, schoolId: true, description: true },
    orderBy: { name: "asc" },
  });

  const rows: SchoolLiftRow[] = activities
    .filter((a) => !hiddenSet.has(a.slug))
    .map((a) => ({
      slug: a.slug,
      name: a.name,
      unit: a.unit,
      custom: a.schoolId != null,
      bodyGroup: resolveLiftBodyGroup({
        slug: a.slug,
        name: a.name,
        description: a.description,
      }),
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

export type SchoolLiftEditDetails = {
  slug: string;
  name: string;
  unit: string;
  direction: "HIGHER_BETTER" | "LOWER_BETTER";
  custom: boolean;
  bodyGroup: LiftBodyGroup;
  ageBrackets: AgeBracketId[];
  genders: Array<"F" | "M">;
  targets: Record<string, Record<string, Record<string, string>>>;
};

export async function getSchoolLiftEditDetails(
  schoolId: string,
  slug: string
): Promise<SchoolLiftEditDetails | null> {
  const activity = await prisma.activity.findFirst({
    where: {
      slug,
      category: { slug: "strength" },
      OR: [{ schoolId }, { schoolId: null }],
    },
  });
  if (!activity) return null;

  const targetRows = await prisma.schoolKpiTarget.findMany({
    where: { schoolId, metricSlug: slug },
  });

  const bracketSet = new Set<AgeBracketId>();
  const genderSet = new Set<"F" | "M">();
  const targets: Record<string, Record<string, Record<string, string>>> = {};

  for (const row of targetRows) {
    if (isAgeBracketId(row.ageBracket)) bracketSet.add(row.ageBracket);
    if (row.gender === "F" || row.gender === "M") genderSet.add(row.gender);
    if (!isAgeBracketId(row.ageBracket)) continue;
    if (row.gender !== "F" && row.gender !== "M") continue;
    if (!MEDALS.includes(row.medal as (typeof MEDALS)[number])) continue;
    targets[row.ageBracket] ??= {};
    targets[row.ageBracket]![row.gender] ??= {};
    targets[row.ageBracket]![row.gender]![row.medal] = String(row.target);
  }

  const direction =
    activity.scoringDirection === "LOWER_BETTER" ? "LOWER_BETTER" : "HIGHER_BETTER";

  return {
    slug: activity.slug,
    name: activity.name,
    unit: activity.unit,
    direction,
    custom: activity.schoolId != null,
    bodyGroup: resolveLiftBodyGroup({
      slug: activity.slug,
      name: activity.name,
      description: activity.description,
    }),
    ageBrackets:
      bracketSet.size > 0 ? [...bracketSet] : [DEFAULT_AGE_BRACKET as AgeBracketId],
    genders: genderSet.size > 0 ? [...genderSet] : ["F", "M"],
    targets,
  };
}
