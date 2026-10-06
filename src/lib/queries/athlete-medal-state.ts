import { prisma } from "@/lib/db";
import {
  KPI_METRIC_META,
  type KpiBand,
  type KpiMark,
  type KpiMetricSlug,
} from "@/lib/kpi-targets";
import { ageBracketForClassYear, isAgeBracketId } from "@/lib/age-brackets";
import { getSchoolKpiBands } from "@/lib/queries/kpi";
import { getStudentContext } from "@/lib/queries/student";
import {
  calculateAthleteMedal,
  type AthleteMedalResult,
} from "@/lib/services/athlete-medal";
import {
  ensureSchoolDefaultKpiSetId,
  getRankedMetricSlugs,
  resolveKpiSetForClassScope,
  resolveKpiSetForStudentContext,
} from "@/lib/services/kpi-sets";

const KPI_SLUGS = KPI_METRIC_META.map((m) => m.slug);

/** Shared medal state for profiles, compare, and compete. */
export async function getAthleteMedalState(
  studentId: string,
  opts: {
    classId?: string | null;
    subgroupId?: string | null;
    ageBracket?: string | null;
    /** Compete tab: class scope with no class → school default (matches leaderboards). */
    kpiScope?: "athlete" | "compete";
  } = {}
): Promise<
  AthleteMedalResult & {
    ageBracket: string;
    rankedSlugs: string[];
    kpiSetId: string | null;
    /** Medal bands from the resolved KPI set (includes custom ranked KPI targets). */
    bands: KpiBand[];
  }
> {
  const { student, currentGrade } = await getStudentContext(studentId);
  const schoolYear = await prisma.schoolYear.findFirst({
    where: { schoolId: student.schoolId, isCurrent: true },
    select: { endDate: true },
  });
  const schoolYearEnd = schoolYear?.endDate?.getFullYear() ?? new Date().getFullYear();
  const defaultBracket = ageBracketForClassYear(currentGrade, schoolYearEnd);
  const bracket =
    opts.ageBracket && isAgeBracketId(opts.ageBracket) ? opts.ageBracket : defaultBracket;

  const competeScope = opts.kpiScope === "compete";
  // Compete compare + coach scope bar: same resolution as leaderboards (class/subgroup
  // set, else school default). Athlete profile / student dashboard: athlete context
  // unless an explicit class is selected.
  let kpiSetId: string | null;
  if (competeScope || opts.classId) {
    kpiSetId = await resolveKpiSetForClassScope(
      student.schoolId,
      opts.classId ?? null,
      opts.subgroupId ?? null
    );
    if (!kpiSetId) kpiSetId = await ensureSchoolDefaultKpiSetId(student.schoolId);
  } else {
    kpiSetId = await resolveKpiSetForStudentContext(student.schoolId, studentId, {
      subgroupId: opts.subgroupId,
    });
    if (!kpiSetId) kpiSetId = await ensureSchoolDefaultKpiSetId(student.schoolId);
  }
  // Strict: only the governing set's ranked KPIs (empty = none ranked).
  const rankedSlugs = kpiSetId ? await getRankedMetricSlugs(kpiSetId) : [...KPI_SLUGS];

  const activities = await prisma.activity.findMany({
    where: {
      slug: {
        in: rankedSlugs,
      },
    },
    select: { id: true, slug: true, scoringDirection: true },
  });
  const idToSlug = new Map(activities.map((a) => [a.id, a.slug]));
  const directionBySlug = new Map(activities.map((a) => [a.slug, a.scoringDirection]));

  const results = await prisma.performanceResult.findMany({
    where: {
      studentId,
      activityId: { in: activities.map((a) => a.id) },
      status: "COMPLETED",
      isBestAttempt: true,
      resultValue: { not: null },
    },
  });

  // isBestAttempt marks the best attempt of each testing session — pick the
  // all-time best value per KPI, not the most recent session's best.
  const bestBySlug = new Map<string, number>();
  for (const r of results) {
    const slug = idToSlug.get(r.activityId);
    if (!slug || r.resultValue == null) continue;
    const current = bestBySlug.get(slug);
    const lower = directionBySlug.get(slug) === "LOWER_BETTER";
    if (current == null || (lower ? r.resultValue < current : r.resultValue > current)) {
      bestBySlug.set(slug, r.resultValue);
    }
  }
  const marks: KpiMark[] = [...bestBySlug].map(([slug, value]) => ({
    slug: slug as KpiMetricSlug,
    value,
  }));

  const custom = await getSchoolKpiBands(
    student.schoolId,
    student.gender,
    bracket,
    kpiSetId
  );

  const medal = calculateAthleteMedal(
    marks,
    student.gender,
    custom,
    rankedSlugs as KpiMetricSlug[]
  );

  return {
    ...medal,
    ageBracket: bracket,
    rankedSlugs,
    kpiSetId,
    bands: custom,
  };
}
