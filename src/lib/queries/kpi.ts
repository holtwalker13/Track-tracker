import { prisma } from "@/lib/db";
import {
  ALL_KPI_BANDS,
  KPI_METRIC_META,
  bandsFromTargets,
  evaluateSprintPotential,
  type KpiBand,
  type KpiMark,
  type KpiMetricSlug,
  type Medal,
  type SprintPotential,
} from "@/lib/kpi-targets";
import {
  ageBracketForClassYear,
  DEFAULT_AGE_BRACKET,
  isAgeBracketId,
  type AgeBracketId,
} from "@/lib/age-brackets";
import { getStudentContext } from "@/lib/queries/student";
import type { ScoringDirection } from "@/lib/constants";
import { rankResults } from "@/lib/services/leaderboard";
import { GRADE_LEVELS } from "@/lib/grades";
import {
  buildRankedKpiMarks,
  expandRankedSlugsToQuerySlugs,
  resolveRankedSlugToActivitySlugs,
  metricMetaMapForRanked,
  type ActivityScoringRow,
} from "@/lib/kpi-marks";

const KPI_SLUGS: KpiMetricSlug[] = KPI_METRIC_META.map((m) => m.slug);

export type MedalTimeWindow = "week" | "all";

export async function ensureSchoolKpiTargets(schoolId: string): Promise<void> {
  const count = await prisma.schoolKpiTarget.count({ where: { schoolId } });
  if (count > 0) return;
  await prisma.schoolKpiTarget.createMany({
    data: ALL_KPI_BANDS.flatMap((band) =>
      KPI_METRIC_META.map((meta) => ({
        schoolId,
        gender: band.gender,
        medal: band.medal,
        metricSlug: meta.slug,
        target: band.targets[meta.slug],
        ageBracket: DEFAULT_AGE_BRACKET,
      }))
    ),
  });
}

export async function getSchoolKpiBands(
  schoolId: string,
  gender?: string | null,
  ageBracket: string = DEFAULT_AGE_BRACKET,
  kpiSetId?: string | null
): Promise<KpiBand[]> {
  // Prefer coach KPI set targets when available
  if (kpiSetId) {
    const { getKpiSetBands } = await import("@/lib/services/kpi-sets");
    return getKpiSetBands(kpiSetId, gender, ageBracket);
  }

  const { resolveSchoolKpiSetId, getKpiSetBands } = await import("@/lib/services/kpi-sets");
  const resolved = await resolveSchoolKpiSetId(schoolId);
  if (resolved) {
    return getKpiSetBands(resolved, gender, ageBracket);
  }

  await ensureSchoolKpiTargets(schoolId);
  const g: "F" | "M" = gender === "M" ? "M" : "F";
  const rows = await prisma.schoolKpiTarget.findMany({
    where: { schoolId, gender: g, ageBracket },
  });
  const byMedal = {
    gold: {} as Record<KpiMetricSlug, number>,
    silver: {} as Record<KpiMetricSlug, number>,
    bronze: {} as Record<KpiMetricSlug, number>,
  };
  for (const row of rows) {
    if (row.medal !== "gold" && row.medal !== "silver" && row.medal !== "bronze") continue;
    byMedal[row.medal as Medal][row.metricSlug as KpiMetricSlug] = row.target;
  }
  return bandsFromTargets(g, byMedal);
}

function weekStart(now = new Date()): Date {
  const d = new Date(now);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d;
}

export async function getStudentClassTags(studentId: string) {
  const enrollments = await prisma.classEnrollment.findMany({
    where: {
      studentId,
      class: { NOT: { name: { startsWith: "Class of" } } },
    },
    include: {
      class: { select: { id: true, name: true, period: true } },
    },
    orderBy: { class: { period: "asc" } },
  });
  return enrollments.map((e) => e.class);
}

export async function getStudentSprintPotential(
  studentId: string,
  opts: {
    ageBracket?: string | null;
    window?: MedalTimeWindow;
    classId?: string | null;
    subgroupId?: string | null;
  } = {}
): Promise<SprintPotential & { ageBracket: AgeBracketId; window: MedalTimeWindow }> {
  const { student, currentGrade } = await getStudentContext(studentId);
  const schoolYear = await prisma.schoolYear.findFirst({
    where: { schoolId: student.schoolId, isCurrent: true },
    select: { endDate: true },
  });
  const schoolYearEnd = schoolYear?.endDate
    ? schoolYear.endDate.getFullYear()
    : new Date().getFullYear();
  const defaultBracket = ageBracketForClassYear(currentGrade, schoolYearEnd);
  const bracket: AgeBracketId =
    opts.ageBracket && isAgeBracketId(opts.ageBracket) ? opts.ageBracket : defaultBracket;
  const window: MedalTimeWindow = opts.window === "week" ? "week" : "all";

  const {
    resolveKpiSetForMedalScope,
    getRankedMetricSlugs,
    ensureSchoolDefaultKpiSetId,
  } = await import("@/lib/services/kpi-sets");
  let kpiSetId = await resolveKpiSetForMedalScope(student.schoolId, studentId, opts);
  if (!kpiSetId && !opts.classId) {
    kpiSetId = await ensureSchoolDefaultKpiSetId(student.schoolId);
  }
  // Strict: only the governing set's ranked KPIs count (empty set = none).
  const rankedSlugList = kpiSetId
    ? await getRankedMetricSlugs(kpiSetId, {
        schoolId: student.schoolId,
        gender: student.gender,
        ageBracket: bracket,
      })
    : [];
  const querySlugs = await expandRankedSlugsToQuerySlugs(student.schoolId, rankedSlugList);
  const querySlugToRanked = new Map<string, string>();
  for (const ranked of rankedSlugList) {
    for (const activitySlug of await resolveRankedSlugToActivitySlugs(
      student.schoolId,
      ranked
    )) {
      querySlugToRanked.set(activitySlug, ranked);
    }
  }

  const activities = await prisma.activity.findMany({
    where: { slug: { in: querySlugs } },
    select: { id: true, slug: true, name: true, scoringDirection: true },
  });
  const idToSlug = new Map(activities.map((a) => [a.id, a.slug as KpiMetricSlug]));
  const activitiesBySlug = new Map<string, ActivityScoringRow>(
    activities.map((a) => [
      a.slug,
      { slug: a.slug, name: a.name, scoringDirection: a.scoringDirection as ActivityScoringRow["scoringDirection"] },
    ])
  );
  const directionBySlug = new Map(activities.map((a) => [a.slug, a.scoringDirection]));

  const results = await prisma.performanceResult.findMany({
    where: {
      studentId,
      activityId: { in: activities.map((a) => a.id) },
      status: "COMPLETED",
      isBestAttempt: true,
      resultValue: { not: null },
      ...(window === "week" ? { testingDate: { gte: weekStart() } } : {}),
    },
  });

  // isBestAttempt marks the best attempt of each testing session — show the
  // best value per KPI (all-time, or within the week window), not the most
  // recent session's best.
  const rawBestBySlug = new Map<string, number>();
  for (const r of results) {
    const slug = idToSlug.get(r.activityId);
    if (!slug || r.resultValue == null) continue;
    const current = rawBestBySlug.get(slug);
    const lower = directionBySlug.get(slug) === "LOWER_BETTER";
    if (current == null || (lower ? r.resultValue < current : r.resultValue > current)) {
      rawBestBySlug.set(slug, r.resultValue);
    }
  }
  const metricMetaBySlug = metricMetaMapForRanked(rankedSlugList, activitiesBySlug);
  const marks: KpiMark[] = buildRankedKpiMarks(
    rankedSlugList,
    rawBestBySlug,
    activitiesBySlug,
    querySlugToRanked
  );

  const custom = kpiSetId
    ? await getSchoolKpiBands(student.schoolId, student.gender, bracket, kpiSetId)
    : opts.classId
      ? []
      : await getSchoolKpiBands(student.schoolId, student.gender, bracket, null);
  return {
    ...evaluateSprintPotential(marks, student.gender, custom, rankedSlugList, metricMetaBySlug),
    ageBracket: bracket,
    window,
  };
}

export type PeerLeaderRow = {
  slug: string;
  name: string;
  isLeader: boolean;
  rank: number | null;
  total: number;
  group: string;
};

/** Weekly (or all-time) leaders among peers in the same age band and optional PE class. */
export async function getStudentPeerLeaders(
  studentId: string,
  opts: {
    ageBracket?: string | null;
    window?: MedalTimeWindow;
    classId?: string | null;
  } = {}
): Promise<PeerLeaderRow[]> {
  const { student, currentGrade } = await getStudentContext(studentId);
  const schoolYear = await prisma.schoolYear.findFirst({
    where: { schoolId: student.schoolId, isCurrent: true },
    select: { id: true, endDate: true },
  });
  if (!schoolYear) return [];

  const schoolYearEnd = schoolYear.endDate.getFullYear();
  const defaultBracket = ageBracketForClassYear(currentGrade, schoolYearEnd);
  const bracket: AgeBracketId =
    opts.ageBracket && isAgeBracketId(opts.ageBracket) ? opts.ageBracket : defaultBracket;
  const window: MedalTimeWindow = opts.window === "week" ? "week" : "all";

  const peerGrades = GRADE_LEVELS.filter(
    (y) => ageBracketForClassYear(y, schoolYearEnd) === bracket
  );

  let peerStudentIds: string[] | undefined;
  if (opts.classId) {
    const enrolled = await prisma.classEnrollment.findMany({
      where: { classId: opts.classId },
      select: { studentId: true },
    });
    peerStudentIds = enrolled.map((e) => e.studentId);
    if (peerStudentIds.length === 0) return [];
  }

  const activities = await prisma.activity.findMany({
    where: { slug: { in: KPI_SLUGS } },
    include: { category: true },
  });

  const rows: PeerLeaderRow[] = [];
  for (const act of activities) {
    const results = await prisma.performanceResult.findMany({
      where: {
        schoolId: student.schoolId,
        schoolYearId: schoolYear.id,
        activityId: act.id,
        status: "COMPLETED",
        isBestAttempt: true,
        resultValue: { not: null },
        gradeLevel: { in: [...peerGrades] },
        ...(student.gender ? { student: { gender: student.gender } } : {}),
        ...(peerStudentIds ? { studentId: { in: peerStudentIds } } : {}),
        ...(window === "week" ? { testingDate: { gte: weekStart() } } : {}),
      },
      select: { studentId: true, resultValue: true },
    });

    const ranked = rankResults(
      results.map((r) => ({ studentId: r.studentId, value: r.resultValue! })),
      act.scoringDirection as ScoringDirection
    );
    const me = ranked.find((e) => e.studentId === studentId);
    rows.push({
      slug: act.slug,
      name: act.name,
      isLeader: me?.rank === 1,
      rank: me?.rank ?? null,
      total: ranked.length,
      group: act.category.slug,
    });
  }

  return rows;
}
