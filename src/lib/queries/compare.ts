import { prisma } from "@/lib/db";
import { formatActivityValue } from "@/lib/format";
import { classYearLabel } from "@/lib/grades";
import { genderGroupLabel } from "@/lib/gender";
import { percentileForResult, getKpiBenchmark } from "@/lib/queries/benchmarks";
import { activityDisplayGroup, DISPLAY_GROUP_ORDER, type ActivityDisplayGroup } from "@/lib/activity-groups";
import type { ScoringDirection } from "@/lib/constants";
import { getStudentContext } from "@/lib/queries/student";

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
  opponentStudentId?: string
): Promise<AthleteCompareView> {
  const { student, currentGrade } = await getStudentContext(studentId);
  if (student.schoolId !== schoolId) {
    throw new Error("Student is not in this school");
  }

  const gender = student.gender;
  const currentYear = await prisma.schoolYear.findFirst({
    where: { schoolId, isCurrent: true },
  });

  const activities = await prisma.activity.findMany({
    where: {
      slug: { notIn: ["height", "weight"] },
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
    const best = await prisma.performanceResult.findFirst({
      where: {
        studentId,
        activityId: act.id,
        status: "COMPLETED",
        isBestAttempt: true,
        resultValue: { not: null },
        ...(currentYear ? { schoolYearId: currentYear.id } : {}),
      },
      orderBy: { testingDate: "desc" },
    });

    const peerWhere = {
      schoolId,
      activityId: act.id,
      gradeLevel: currentGrade,
      status: "COMPLETED" as const,
      isBestAttempt: true,
      resultValue: { not: null },
      studentId: { not: studentId },
      ...(currentYear ? { schoolYearId: currentYear.id } : {}),
      ...(gender ? { student: { gender } } : {}),
    };

    const peerAgg = await prisma.performanceResult.aggregate({
      where: peerWhere,
      _avg: { resultValue: true },
    });

    const bench = await getKpiBenchmark(act.id, gender, schoolId);

    const athleteValue = best?.resultValue ?? null;
    const peerAvg = peerAgg._avg.resultValue ?? null;
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
          orderBy: { testingDate: "desc" },
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
      benchmarkP50: bench?.p50 ?? null,
      benchmarkDisplay:
        bench?.p50 != null ? formatActivityValue(bench.p50, act.unit, act.slug) : "—",
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
    peerLabel: `${classYearLabel(currentGrade)} ${genderGroupLabel(gender)} avg`,
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
  opts?: { anonymize?: boolean; viewerStudentId?: string }
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
        : `Student ${ctx.student.anonymousId}`
      : fullName;
    athletes.push({
      id: ctx.student.id,
      name,
      grade: ctx.currentGrade,
      gender: ctx.student.gender,
    });
  }

  const activities = await prisma.activity.findMany({
    where: {
      slug: { notIn: ["height", "weight"] },
      OR: [{ schoolId: null }, { schoolId }],
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

  const best = new Map<string, { value: number; display: string }>();
  for (const r of results) {
    if (r.resultValue == null) continue;
    const key = `${r.studentId}:${r.activityId}`;
    if (best.has(key)) continue;
    const act = activities.find((a) => a.id === r.activityId);
    best.set(key, {
      value: r.resultValue,
      display: r.displayValue ?? (act ? formatActivityValue(r.resultValue, act.unit, act.slug) : String(r.resultValue)),
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

