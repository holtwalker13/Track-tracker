import { prisma } from "@/lib/db";
import { formatActivityValue } from "@/lib/format";
import { activityDisplayGroup, DISPLAY_GROUP_ORDER, type ActivityDisplayGroup } from "@/lib/activity-groups";
import type { ScoringDirection } from "@/lib/constants";

export type RangeMark = {
  activityId: string;
  activityName: string;
  activitySlug: string;
  categorySlug: string;
  unit: string;
  direction: ScoringDirection;
  group: ActivityDisplayGroup;
  count: number;
  avg: number | null;
  avgDisplay: string;
  pr: number | null;
  prDisplay: string;
  latest: number | null;
  latestDisplay: string;
};

export type MarksWindow = {
  from: string;
  to: string;
  dates: string[];
  marks: RangeMark[];
};

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getStudentMarksWindow(
  studentId: string,
  from?: string | null,
  to?: string | null
): Promise<MarksWindow> {
  const all = await prisma.performanceResult.findMany({
    where: {
      studentId,
      status: "COMPLETED",
      isBestAttempt: true,
      resultValue: { not: null },
    },
    include: { activity: { include: { category: true } } },
    orderBy: { testingDate: "asc" },
  });

  const dateSet = [...new Set(all.map((r) => isoDay(r.testingDate)))].sort();
  const min = dateSet[0];
  const max = dateSet[dateSet.length - 1];
  const fromDay = from && dateSet.includes(from) ? from : min;
  const toDay = to && dateSet.includes(to) ? to : max;

  const inRange =
    fromDay && toDay
      ? all.filter((r) => {
          const day = isoDay(r.testingDate);
          return day >= fromDay && day <= toDay;
        })
      : all;

  const byActivity = new Map<string, typeof inRange>();
  for (const r of inRange) {
    const list = byActivity.get(r.activityId) ?? [];
    list.push(r);
    byActivity.set(r.activityId, list);
  }

  const marks: RangeMark[] = [];
  for (const [, rows] of byActivity) {
    const act = rows[0]!.activity;
    if (act.slug === "height" || act.slug === "weight") continue;
    const direction = act.scoringDirection as ScoringDirection;
    const values = rows.map((r) => r.resultValue!).filter((v) => Number.isFinite(v));
    if (values.length === 0) continue;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const pr =
      direction === "HIGHER_BETTER" ? Math.max(...values) : Math.min(...values);
    const latest = rows[rows.length - 1]!.resultValue!;
    marks.push({
      activityId: act.id,
      activityName: act.name,
      activitySlug: act.slug,
      categorySlug: act.category.slug,
      unit: act.unit,
      direction,
      group: activityDisplayGroup(act.slug, act.category.slug),
      count: values.length,
      avg,
      avgDisplay: formatActivityValue(avg, act.unit, act.slug),
      pr,
      prDisplay: formatActivityValue(pr, act.unit, act.slug),
      latest,
      latestDisplay: formatActivityValue(latest, act.unit, act.slug),
    });
  }

  marks.sort((a, b) => {
    const ai = DISPLAY_GROUP_ORDER.indexOf(a.group);
    const bi = DISPLAY_GROUP_ORDER.indexOf(b.group);
    if (ai !== bi) return ai - bi;
    return a.activityName.localeCompare(b.activityName);
  });

  return {
    from: fromDay ?? "",
    to: toDay ?? "",
    dates: dateSet,
    marks,
  };
}
