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
  ageBracket: string = DEFAULT_AGE_BRACKET
): Promise<KpiBand[]> {
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

  const activities = await prisma.activity.findMany({
    where: { slug: { in: KPI_SLUGS } },
    select: { id: true, slug: true },
  });
  const idToSlug = new Map(activities.map((a) => [a.id, a.slug as KpiMetricSlug]));

  const results = await prisma.performanceResult.findMany({
    where: {
      studentId,
      activityId: { in: activities.map((a) => a.id) },
      status: "COMPLETED",
      isBestAttempt: true,
      resultValue: { not: null },
      ...(window === "week" ? { testingDate: { gte: weekStart() } } : {}),
    },
    orderBy: { testingDate: "desc" },
  });

  const seen = new Set<string>();
  const marks: KpiMark[] = [];
  for (const r of results) {
    const slug = idToSlug.get(r.activityId);
    if (!slug || seen.has(slug) || r.resultValue == null) continue;
    seen.add(slug);
    marks.push({ slug, value: r.resultValue });
  }

  const custom = await getSchoolKpiBands(student.schoolId, student.gender, bracket);
  return {
    ...evaluateSprintPotential(marks, student.gender, custom),
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
