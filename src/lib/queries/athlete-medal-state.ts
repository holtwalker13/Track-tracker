import { prisma } from "@/lib/db";
import { KPI_METRIC_META, type KpiMark, type KpiMetricSlug } from "@/lib/kpi-targets";
import { ageBracketForClassYear, isAgeBracketId } from "@/lib/age-brackets";
import { getSchoolKpiBands } from "@/lib/queries/kpi";
import { getStudentContext } from "@/lib/queries/student";
import {
  calculateAthleteMedal,
  type AthleteMedalResult,
} from "@/lib/services/athlete-medal";
import {
  getRankedMetricSlugs,
  resolveKpiSetForClassContext,
} from "@/lib/services/kpi-sets";

const KPI_SLUGS = KPI_METRIC_META.map((m) => m.slug);

/** Shared medal state for profiles, compare, and compete. */
export async function getAthleteMedalState(
  studentId: string,
  opts: { classId?: string | null; subgroupId?: string | null; ageBracket?: string | null } = {}
): Promise<
  AthleteMedalResult & {
    ageBracket: string;
    rankedSlugs: string[];
    kpiSetId: string | null;
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

  const kpiSetId = await resolveKpiSetForClassContext(
    student.schoolId,
    opts.classId,
    opts.subgroupId
  );
  const rankedSlugs = kpiSetId ? await getRankedMetricSlugs(kpiSetId) : [];

  const activities = await prisma.activity.findMany({
    where: {
      slug: {
        in: rankedSlugs.length > 0 ? rankedSlugs : KPI_SLUGS,
      },
    },
    select: { id: true, slug: true },
  });
  const idToSlug = new Map(activities.map((a) => [a.id, a.slug]));

  const results = await prisma.performanceResult.findMany({
    where: {
      studentId,
      activityId: { in: activities.map((a) => a.id) },
      status: "COMPLETED",
      isBestAttempt: true,
      resultValue: { not: null },
    },
    orderBy: { testingDate: "desc" },
  });

  const seen = new Set<string>();
  const marks: KpiMark[] = [];
  for (const r of results) {
    const slug = idToSlug.get(r.activityId);
    if (!slug || seen.has(slug) || r.resultValue == null) continue;
    seen.add(slug);
    marks.push({ slug: slug as KpiMetricSlug, value: r.resultValue });
  }

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
  };
}
