import { prisma } from "@/lib/db";
import type { ScoringDirection } from "@/lib/constants";
import { percentileForResult } from "./benchmarks";
import { calculateImprovement } from "@/lib/services/performance";
import {
  activityDisplayGroup,
  DISPLAY_GROUP_ORDER,
  type ActivityDisplayGroup,
} from "@/lib/activity-groups";
import { formatActivityValue } from "@/lib/format";
import { DEFAULT_CLASS_YEAR } from "@/lib/grades";

export type AttemptEventRow = {
  id: string;
  schoolYearId: string;
  testingDate: Date;
  activityId: string;
  activityName: string;
  activitySlug: string;
  unit: string;
  direction: ScoringDirection;
  attempts: number[];
  best: number;
  bestDisplay: string;
  isPersonalRecord: boolean;
  deltaFromPrevious: number | null;
  deltaDisplay: string | null;
  sessionName: string | null;
};

export type SchoolYearAttemptLog = {
  schoolYearId: string;
  label: string;
  isCurrent: boolean;
  gradeLevel: number | null;
  events: AttemptEventRow[];
};

function eventKey(r: {
  schoolYearId: string;
  activityId: string;
  testingSessionId: string | null;
  testingDate: Date;
}) {
  const day = r.testingDate.toISOString().slice(0, 10);
  return `${r.schoolYearId}:${r.activityId}:${r.testingSessionId ?? "none"}:${day}`;
}

export async function getScholasticAttemptLog(studentId: string): Promise<SchoolYearAttemptLog[]> {
  const results = await prisma.performanceResult.findMany({
    where: {
      studentId,
      status: "COMPLETED",
      resultValue: { not: null },
    },
    include: {
      activity: true,
      schoolYear: true,
      testingSession: true,
    },
    orderBy: { testingDate: "asc" },
  });

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { studentId },
  });
  const gradeByYear = new Map(enrollments.map((e) => [e.schoolYearId, e.gradeLevel]));

  const yearsMap = new Map<string, SchoolYearAttemptLog>();

  for (const r of results) {
    if (!yearsMap.has(r.schoolYearId)) {
      yearsMap.set(r.schoolYearId, {
        schoolYearId: r.schoolYearId,
        label: r.schoolYear.label,
        isCurrent: r.schoolYear.isCurrent,
        gradeLevel: gradeByYear.get(r.schoolYearId) ?? null,
        events: [],
      });
    }
  }

  const eventRows = new Map<string, AttemptEventRow>();

  for (const r of results) {
    const key = eventKey(r);
    const direction = r.activity.scoringDirection as ScoringDirection;
    let row = eventRows.get(key);
    if (!row) {
      row = {
        id: key,
        schoolYearId: r.schoolYearId,
        testingDate: r.testingDate,
        activityId: r.activityId,
        activityName: r.activity.name,
        activitySlug: r.activity.slug,
        unit: r.activity.unit,
        direction,
        attempts: [],
        best: r.resultValue!,
        bestDisplay: r.displayValue ?? formatActivityValue(r.resultValue!, r.activity.unit, r.activity.slug),
        isPersonalRecord: r.isPersonalRecord,
        deltaFromPrevious: null,
        deltaDisplay: null,
        sessionName: r.testingSession?.name ?? null,
      };
      eventRows.set(key, row);
    }
    if (r.resultValue != null) {
      row.attempts.push(r.resultValue);
      if (r.isBestAttempt) {
        row.best = r.resultValue;
        row.bestDisplay =
          r.displayValue ?? formatActivityValue(r.resultValue, r.activity.unit, r.activity.slug);
        row.isPersonalRecord = r.isPersonalRecord;
      }
    }
  }

  // Per school year + activity: compute delta vs previous event (chronological)
  const byYearActivity = new Map<string, AttemptEventRow[]>();
  for (const row of eventRows.values()) {
    const sy = row.schoolYearId;
    const list = byYearActivity.get(`${sy}:${row.activityId}`) ?? [];
    list.push(row);
    byYearActivity.set(`${sy}:${row.activityId}`, list);
  }

  for (const list of byYearActivity.values()) {
    list.sort((a, b) => a.testingDate.getTime() - b.testingDate.getTime());
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1];
      const cur = list[i];
      const imp = calculateImprovement(cur.best, prev.best, cur.direction);
      cur.deltaFromPrevious = imp.absolute;
      const sign = imp.absolute >= 0 ? "+" : "";
      cur.deltaDisplay = `${sign}${imp.absolute.toFixed(1)} vs prior attempt`;
    }
  }

  for (const row of eventRows.values()) {
    const log = yearsMap.get(row.schoolYearId)!;
    log.events.push(row);
  }

  for (const log of yearsMap.values()) {
    log.events.sort((a, b) => b.testingDate.getTime() - a.testingDate.getTime());
  }

  return Array.from(yearsMap.values()).sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    return b.label.localeCompare(a.label);
  });
}

export type LatestResultHistory = {
  display: string;
  testingDate: Date;
};

export type LatestResultItem = {
  activityId: string;
  activityName: string;
  activitySlug: string;
  unit: string;
  direction: ScoringDirection;
  value: number;
  display: string;
  testingDate: Date;
  percentile: number | null;
  deltaFromPrevious: number | null;
  deltaDisplay: string | null;
  isPr: boolean;
  group: ActivityDisplayGroup;
  previousPercentile: number | null;
  percentileDelta: number | null;
  percentileTrend: { label: string; percentile: number; display: string }[];
  history: LatestResultHistory[];
};

export async function getLatestResultsGrouped(
  studentId: string,
  schoolYearId?: string
): Promise<Record<ActivityDisplayGroup, LatestResultItem[]>> {
  let yearFilter = schoolYearId;
  if (!yearFilter) {
    const enr = await prisma.studentEnrollment.findFirst({
      where: { studentId, schoolYear: { isCurrent: true } },
    });
    yearFilter = enr?.schoolYearId;
  }

  const results = await prisma.performanceResult.findMany({
    where: {
      studentId,
      status: "COMPLETED",
      isBestAttempt: true,
      resultValue: { not: null },
      ...(yearFilter ? { schoolYearId: yearFilter } : {}),
    },
    include: { activity: { include: { category: true } } },
    orderBy: { testingDate: "desc" },
  });

  const latestByActivity = new Map<string, (typeof results)[0]>();
  for (const r of results) {
    if (!latestByActivity.has(r.activityId)) {
      latestByActivity.set(r.activityId, r);
    }
  }

  const grouped: Record<ActivityDisplayGroup, LatestResultItem[]> = {
    running: [],
    jumping: [],
    other: [],
  };

  const enrollment = yearFilter
    ? await prisma.studentEnrollment.findFirst({
        where: { studentId, schoolYearId: yearFilter },
      })
    : null;
  const gradeLevel = enrollment?.gradeLevel ?? DEFAULT_CLASS_YEAR;

  for (const r of latestByActivity.values()) {
    const direction = r.activity.scoringDirection as ScoringDirection;

    const previous = await prisma.performanceResult.findFirst({
      where: {
        studentId,
        activityId: r.activityId,
        status: "COMPLETED",
        isBestAttempt: true,
        resultValue: { not: null },
        testingDate: { lt: r.testingDate },
        ...(yearFilter ? { schoolYearId: yearFilter } : {}),
      },
      orderBy: { testingDate: "desc" },
    });

    let deltaFromPrevious: number | null = null;
    let deltaDisplay: string | null = null;
    if (previous?.resultValue != null && r.resultValue != null) {
      const imp = calculateImprovement(r.resultValue, previous.resultValue, direction);
      deltaFromPrevious = imp.absolute;
      const sign = imp.absolute >= 0 ? "+" : "";
      deltaDisplay = `${sign}${imp.absolute.toFixed(1)} since last attempt`;
    }

    const percentile =
      r.resultValue != null
        ? await percentileForResult(r.activityId, gradeLevel, r.resultValue, direction)
        : null;

    let previousPercentile: number | null = null;
    if (previous?.resultValue != null) {
      previousPercentile = await percentileForResult(
        r.activityId,
        gradeLevel,
        previous.resultValue,
        direction
      );
    }
    const percentileDelta =
      percentile != null && previousPercentile != null
        ? percentile - previousPercentile
        : null;

    const yearAttempts = await prisma.performanceResult.findMany({
      where: {
        studentId,
        activityId: r.activityId,
        schoolYearId: yearFilter,
        status: "COMPLETED",
        isBestAttempt: true,
        resultValue: { not: null },
      },
      orderBy: { testingDate: "asc" },
    });
    const percentileTrend: { label: string; percentile: number; display: string }[] = [];
    for (const att of yearAttempts) {
      if (att.resultValue == null) continue;
      const p = await percentileForResult(
        r.activityId,
        gradeLevel,
        att.resultValue,
        direction
      );
      if (p != null) {
        percentileTrend.push({
          label: att.testingDate.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          percentile: p,
          display:
            att.displayValue ??
            formatActivityValue(att.resultValue, r.activity.unit, r.activity.slug),
        });
      }
    }

    const priorAttempts = await prisma.performanceResult.findMany({
      where: {
        studentId,
        activityId: r.activityId,
        status: "COMPLETED",
        isBestAttempt: true,
        resultValue: { not: null },
        testingDate: { lt: r.testingDate },
      },
      orderBy: { testingDate: "desc" },
      take: 3,
    });
    const history: LatestResultHistory[] = priorAttempts.map((att) => ({
      display:
        att.displayValue ??
        formatActivityValue(att.resultValue!, r.activity.unit, r.activity.slug),
      testingDate: att.testingDate,
    }));

    const group = activityDisplayGroup(r.activity.slug, r.activity.category.slug);

    grouped[group].push({
      activityId: r.activityId,
      activityName: r.activity.name,
      activitySlug: r.activity.slug,
      unit: r.activity.unit,
      direction,
      value: r.resultValue!,
      display: r.displayValue ?? formatActivityValue(r.resultValue!, r.activity.unit, r.activity.slug),
      testingDate: r.testingDate,
      percentile,
      deltaFromPrevious,
      deltaDisplay,
      isPr: r.isPersonalRecord,
      group,
      previousPercentile,
      percentileDelta,
      percentileTrend,
      history,
    });
  }

  for (const g of DISPLAY_GROUP_ORDER) {
    grouped[g].sort((a, b) => a.activityName.localeCompare(b.activityName));
  }

  return grouped;
}
