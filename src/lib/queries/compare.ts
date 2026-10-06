import { prisma } from "@/lib/db";
import { formatActivityValue } from "@/lib/format";
import { classYearLabel } from "@/lib/grades";
import { genderGroupLabel } from "@/lib/gender";
import { percentileForResult, getKpiBenchmark } from "@/lib/queries/benchmarks";
import { activityDisplayGroup, DISPLAY_GROUP_ORDER, type ActivityDisplayGroup } from "@/lib/activity-groups";
import type { ScoringDirection } from "@/lib/constants";
import { getStudentContext } from "@/lib/queries/student";
import { getAthleteMedalState } from "@/lib/queries/athlete-medal-state";
import { MEDAL_LABELS } from "@/lib/kpi-targets";

export type CompareEventRow = {
  activityId: string;
  activityName: string;
  activitySlug: string;
  categorySlug: string;
  unit: string;
  direction: ScoringDirection;
  group: ActivityDisplayGroup;
  athleteValue: number | null;
  athleteDisplay: string;
  peerAvg: number | null;
  peerDisplay: string;
  benchmarkP50: number | null;
  benchmarkDisplay: string;
  percentile: number | null;
  vsPeerAbsolute: number | null;
  vsPeerPercent: number | null;
  betterThanPeer: boolean | null;
  opponentValue: number | null;
  opponentDisplay: string;
};

export type AthleteCompareView = {
  student: {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    grade: number;
    gender: string | null;
    studentNumber: string;
    schoolId: string;
  };
  peerLabel: string;
  opponent: {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    grade: number;
    gender: string | null;
  } | null;
  events: CompareEventRow[];
};

function vsPeer(
  athlete: number | null,
  peer: number | null,
  direction: ScoringDirection
): { abs: number | null; pct: number | null; better: boolean | null } {
  if (athlete == null || peer == null || peer === 0) {
    return { abs: null, pct: null, better: null };
  }
  const abs = athlete - peer;
  const pct = (abs / peer) * 100;
  const better = direction === "HIGHER_BETTER" ? athlete > peer : athlete < peer;
  return { abs, pct, better };
}

export async function getAthleteCompare(
  studentId: string,
  schoolId: string,
  opponentStudentId?: string,
  opts?: { classId?: string | null; subgroupId?: string | null }
): Promise<AthleteCompareView & { medalTargetLabel?: string }> {
  const { student, currentGrade } = await getStudentContext(studentId);
  if (student.schoolId !== schoolId) {
    throw new Error("Student is not in this school");
  }

  const gender = student.gender;
  const currentYear = await prisma.schoolYear.findFirst({
    where: { schoolId, isCurrent: true },
  });

  // Peer baseline comes from the selected class/subgroup roster when scoped.
  let peerStudentIds: string[] | null = null;
  let peerScopeName: string | null = null;
  if (opts?.classId) {
    if (opts.subgroupId) {
      const sg = await prisma.classSubgroup.findFirst({
        where: { id: opts.subgroupId, classId: opts.classId },
        select: { name: true, members: { select: { studentId: true } } },
      });
      peerStudentIds = sg ? sg.members.map((m) => m.studentId) : [];
      peerScopeName = sg?.name ?? null;
    } else {
      const cls = await prisma.class.findFirst({
        where: { id: opts.classId, schoolId },
        select: { name: true, enrollments: { select: { studentId: true } } },
      });
      peerStudentIds = cls ? cls.enrollments.map((e) => e.studentId) : [];
      peerScopeName = cls?.name ?? null;
    }
  }

  const medalState = await getAthleteMedalState(studentId, {
    classId: opts?.classId,
    subgroupId: opts?.subgroupId,
  });
  const rankedSlugs = new Set(medalState.rankedSlugs);
  // Medal targets come from the resolved KPI set's band for the active medal, so
  // custom ranked KPIs (not just catalog metrics) carry their KPI-tab targets.
  const activeMedal = medalState.nextMedal ?? medalState.earnedMedal ?? "bronze";
  const activeBand = medalState.bands.find((b) => b.medal === activeMedal);
  const targetBySlug = new Map<string, number>();
  for (const [slug, target] of Object.entries(activeBand?.targets ?? {})) {
    if (typeof target === "number" && Number.isFinite(target)) {
      targetBySlug.set(slug, target);
    }
  }
  const medalTargetLabel = medalState.nextMedal
    ? `${MEDAL_LABELS[medalState.nextMedal]} target`
    : medalState.earnedMedal
      ? `${MEDAL_LABELS[medalState.earnedMedal]} earned`
      : "Medal target";

  const rankedSlugList = [...rankedSlugs];
  const activities =
    rankedSlugList.length === 0
      ? []
      : await prisma.activity.findMany({
          where: {
            slug: { in: rankedSlugList, notIn: ["height", "weight"] },
            OR: [{ schoolId: null }, { schoolId }],
          },
          include: { category: true },
          orderBy: { name: "asc" },
        });

  const events: CompareEventRow[] = [];

  const opponentCtx = opponentStudentId
    ? await getStudentContext(opponentStudentId)
    : null;
  if (opponentCtx && opponentCtx.student.schoolId !== schoolId) {
    throw new Error("Opponent is not in this school");
  }

  for (const act of activities) {
    const direction = act.scoringDirection as ScoringDirection;
    // Best result (not most recent): isBestAttempt is per-session best, so
    // order by value in the scoring direction.
    const best = await prisma.performanceResult.findFirst({
      where: {
        studentId,
        activityId: act.id,
        status: "COMPLETED",
        isBestAttempt: true,
        resultValue: { not: null },
        ...(currentYear ? { schoolYearId: currentYear.id } : {}),
      },
      orderBy: { resultValue: direction === "LOWER_BETTER" ? "asc" : "desc" },
    });

    const peerWhere = {
      schoolId,
      activityId: act.id,
      gradeLevel: currentGrade,
      status: "COMPLETED" as const,
      isBestAttempt: true,
      resultValue: { not: null },
      studentId: {
        not: studentId,
        ...(peerStudentIds ? { in: peerStudentIds } : {}),
      },
      ...(currentYear ? { schoolYearId: currentYear.id } : {}),
      ...(gender ? { student: { gender } } : {}),
    };

    // Average of each peer's best result (not all session bests blended).
    const peerRows = await prisma.performanceResult.findMany({
      where: peerWhere,
      select: { studentId: true, resultValue: true },
    });
    const bestByPeer = new Map<string, number>();
    for (const r of peerRows) {
      if (r.resultValue == null) continue;
      const current = bestByPeer.get(r.studentId);
      const lower = direction === "LOWER_BETTER";
      if (current == null || (lower ? r.resultValue < current : r.resultValue > current)) {
        bestByPeer.set(r.studentId, r.resultValue);
      }
    }
    const peerBestAvg =
      bestByPeer.size > 0
        ? [...bestByPeer.values()].reduce((a, b) => a + b, 0) / bestByPeer.size
        : null;

    const bench = await getKpiBenchmark(act.id, gender, schoolId);
    const medalTarget = targetBySlug.get(act.slug) ?? null;

    const athleteValue = best?.resultValue ?? null;
    const peerAvg = peerBestAvg;
    const delta = vsPeer(athleteValue, peerAvg, direction);
    const percentile =
      athleteValue != null
        ? await percentileForResult(act.id, currentGrade, athleteValue, direction)
        : null;

    const oppBest = opponentStudentId
      ? await prisma.performanceResult.findFirst({
          where: {
            studentId: opponentStudentId,
            activityId: act.id,
            status: "COMPLETED",
            isBestAttempt: true,
            resultValue: { not: null },
            ...(currentYear ? { schoolYearId: currentYear.id } : {}),
          },
          orderBy: { resultValue: direction === "LOWER_BETTER" ? "asc" : "desc" },
        })
      : null;
    const opponentValue = oppBest?.resultValue ?? null;

    events.push({
      activityId: act.id,
      activityName: act.name,
      activitySlug: act.slug,
      categorySlug: act.category.slug,
      unit: act.unit,
      direction,
      group: activityDisplayGroup(act.slug, act.category.slug),
      athleteValue,
      athleteDisplay:
        athleteValue != null
          ? (best?.displayValue ?? formatActivityValue(athleteValue, act.unit, act.slug))
          : "—",
      peerAvg,
      peerDisplay:
        peerAvg != null ? formatActivityValue(peerAvg, act.unit, act.slug) : "—",
      benchmarkP50: medalTarget ?? bench?.p50 ?? null,
      benchmarkDisplay:
        medalTarget != null
          ? formatActivityValue(medalTarget, act.unit, act.slug)
          : bench?.p50 != null
            ? formatActivityValue(bench.p50, act.unit, act.slug)
            : "—",
      percentile,
      vsPeerAbsolute: delta.abs,
      vsPeerPercent: delta.pct,
      betterThanPeer: delta.better,
      opponentValue,
      opponentDisplay:
        opponentValue != null
          ? (oppBest?.displayValue ?? formatActivityValue(opponentValue, act.unit, act.slug))
          : "—",
    });
  }

  events.sort((a, b) => {
    const ai = DISPLAY_GROUP_ORDER.indexOf(a.group);
    const bi = DISPLAY_GROUP_ORDER.indexOf(b.group);
    if (ai !== bi) return ai - bi;
    return a.activityName.localeCompare(b.activityName);
  });

  return {
    student: {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      firstName: student.firstName,
      lastName: student.lastName,
      grade: currentGrade,
      gender,
      studentNumber: student.studentNumber,
      schoolId: student.schoolId,
    },
    peerLabel: peerScopeName
      ? `${peerScopeName} avg`
      : `${classYearLabel(currentGrade)} ${genderGroupLabel(gender)} avg`,
    opponent: opponentCtx
      ? {
          id: opponentCtx.student.id,
          name: `${opponentCtx.student.firstName} ${opponentCtx.student.lastName}`,
          firstName: opponentCtx.student.firstName,
          lastName: opponentCtx.student.lastName,
          grade: opponentCtx.currentGrade,
          gender: opponentCtx.student.gender,
        }
      : null,
    events,
    medalTargetLabel,
  };
}

export type LineupAthlete = {
  id: string;
  name: string;
  grade: number;
  gender: string | null;
};

export type LineupEvent = {
  activityId: string;
  activityName: string;
  activitySlug: string;
  categorySlug: string;
  unit: string;
  direction: ScoringDirection;
  group: ActivityDisplayGroup;
  marks: Record<string, { value: number | null; display: string }>;
};

export type AthleteLineupView = {
  athletes: LineupAthlete[];
  events: LineupEvent[];
};

const MAX_LINEUP = 5;

export async function getAthleteLineup(
  studentIds: string[],
  schoolId: string,
  opts?: {
    anonymize?: boolean;
    viewerStudentId?: string;
    kpiStudentId?: string;
    classId?: string | null;
    subgroupId?: string | null;
  }
): Promise<AthleteLineupView> {
  const unique = [...new Set(studentIds)].slice(0, MAX_LINEUP);
  const currentYear = await prisma.schoolYear.findFirst({
    where: { schoolId, isCurrent: true },
  });

  const athletes: LineupAthlete[] = [];
  for (const id of unique) {
    const ctx = await getStudentContext(id);
    if (ctx.student.schoolId !== schoolId) continue;
    const fullName = `${ctx.student.firstName} ${ctx.student.lastName}`;
    const name = opts?.anonymize
      ? opts.viewerStudentId === ctx.student.id
        ? "You"
        : ctx.student.nameHidden
          ? "Hidden"
          : fullName
      : fullName;
    athletes.push({
      id: ctx.student.id,
      name,
      grade: ctx.currentGrade,
      gender: ctx.student.gender,
    });
  }

  // Restrict the lineup to the ranked KPIs of the selected class/subgroup KPI
  // set when scoped (coach scope bar); otherwise the viewed athlete's own class
  // KPI set. No set at all → legacy full list.
  let rankedFilter: string[] | null = null;
  if (opts?.classId) {
    const { resolveKpiSetForClassScope, getRankedMetricSlugs } = await import(
      "@/lib/services/kpi-sets"
    );
    const setId = await resolveKpiSetForClassScope(schoolId, opts.classId, opts.subgroupId);
    // Strict: a selected scope shows exactly its ranked KPIs, even if empty.
    rankedFilter = setId ? await getRankedMetricSlugs(setId) : [];
  } else {
    const kpiStudentId = opts?.kpiStudentId ?? athletes[0]?.id;
    if (kpiStudentId && athletes.some((a) => a.id === kpiStudentId)) {
      const medalState = await getAthleteMedalState(kpiStudentId);
      if (medalState.kpiSetId) rankedFilter = medalState.rankedSlugs;
    }
  }

  const activities = await prisma.activity.findMany({
    where: {
      OR: [{ schoolId: null }, { schoolId }],
      ...(rankedFilter
        ? { slug: { in: rankedFilter } }
        : { slug: { notIn: ["height", "weight"] } }),
    },
    include: { category: true },
    orderBy: { name: "asc" },
  });

  const results = await prisma.performanceResult.findMany({
    where: {
      studentId: { in: athletes.map((a) => a.id) },
      status: "COMPLETED",
      isBestAttempt: true,
      resultValue: { not: null },
      ...(currentYear ? { schoolYearId: currentYear.id } : {}),
    },
    orderBy: { testingDate: "desc" },
  });

  // Best result per athlete per KPI (isBestAttempt is per-session best).
  const best = new Map<string, { value: number; display: string }>();
  for (const r of results) {
    if (r.resultValue == null) continue;
    const key = `${r.studentId}:${r.activityId}`;
    const act = activities.find((a) => a.id === r.activityId);
    if (!act) continue;
    const lower = act.scoringDirection === "LOWER_BETTER";
    const existing = best.get(key);
    if (existing && (lower ? existing.value <= r.resultValue : existing.value >= r.resultValue)) {
      continue;
    }
    best.set(key, {
      value: r.resultValue,
      display: r.displayValue ?? formatActivityValue(r.resultValue, act.unit, act.slug),
    });
  }

  const events: LineupEvent[] = activities.map((act) => {
    const marks: LineupEvent["marks"] = {};
    for (const a of athletes) {
      const hit = best.get(`${a.id}:${act.id}`);
      marks[a.id] = hit
        ? { value: hit.value, display: hit.display }
        : { value: null, display: "—" };
    }
    return {
      activityId: act.id,
      activityName: act.name,
      activitySlug: act.slug,
      categorySlug: act.category.slug,
      unit: act.unit,
      direction: act.scoringDirection as ScoringDirection,
      group: activityDisplayGroup(act.slug, act.category.slug),
      marks,
    };
  });

  events.sort((a, b) => {
    const ai = DISPLAY_GROUP_ORDER.indexOf(a.group);
    const bi = DISPLAY_GROUP_ORDER.indexOf(b.group);
    if (ai !== bi) return ai - bi;
    return a.activityName.localeCompare(b.activityName);
  });

  return { athletes, events };
}

