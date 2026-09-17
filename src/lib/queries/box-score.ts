import { prisma } from "@/lib/db";
import {
  ACTIVITY_ABBR,
  DISPLAY_GROUP_LABELS,
  DISPLAY_GROUP_ORDER,
  activityDisplayGroup,
  type ActivityDisplayGroup,
} from "@/lib/activity-groups";
import { formatActivityValue } from "@/lib/format";
import { boxScoreName } from "@/lib/utils";
import type { ScoringDirection } from "@/lib/constants";
import type { AthleteGender } from "@/lib/gender";

export type BoxScoreActivity = {
  id: string;
  slug: string;
  name: string;
  abbr: string;
  unit: string;
  direction: ScoringDirection;
};

export type BoxScoreMark = {
  value: number;
  display: string;
};

export type BoxScoreRow = {
  studentId: string;
  name: string;
  fullName: string;
  marks: Record<string, BoxScoreMark>;
};

export type BoxScoreGroup = {
  group: ActivityDisplayGroup;
  label: string;
  activities: BoxScoreActivity[];
  rows: BoxScoreRow[];
  totals: Record<string, BoxScoreMark>;
};

export type GradeBoxScore = {
  grade: number;
  groups: BoxScoreGroup[];
};

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export async function getGradeBoxScores(
  schoolId: string,
  grades: number[],
  gender: AthleteGender
): Promise<GradeBoxScore[]> {
  const currentYear = await prisma.schoolYear.findFirst({
    where: { schoolId, isCurrent: true },
  });
  if (!currentYear || grades.length === 0) return [];

  const activities = await prisma.activity.findMany({
    where: { slug: { notIn: ["height", "weight"] } },
    include: { category: true },
    orderBy: { name: "asc" },
  });

  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      schoolYearId: currentYear.id,
      gradeLevel: { in: grades },
      student: { schoolId, gender },
    },
    include: { student: true },
  });

  const results = await prisma.performanceResult.findMany({
    where: {
      schoolId,
      schoolYearId: currentYear.id,
      gradeLevel: { in: grades },
      status: "COMPLETED",
      isBestAttempt: true,
      resultValue: { not: null },
      student: { gender },
    },
  });

  const markByStudent = new Map<string, Map<string, BoxScoreMark>>();
  for (const r of results) {
    if (r.resultValue == null) continue;
    const act = activities.find((a) => a.id === r.activityId);
    if (!act) continue;
    if (!markByStudent.has(r.studentId)) markByStudent.set(r.studentId, new Map());
    markByStudent.get(r.studentId)!.set(act.slug, {
      value: r.resultValue,
      display: r.displayValue ?? formatActivityValue(r.resultValue, act.unit, act.slug),
    });
  }

  const studentsByGrade = new Map<number, typeof enrollments>();
  for (const e of enrollments) {
    const list = studentsByGrade.get(e.gradeLevel) ?? [];
    list.push(e);
    studentsByGrade.set(e.gradeLevel, list);
  }

  const catalogByGroup = new Map<ActivityDisplayGroup, BoxScoreActivity[]>();
  for (const act of activities) {
    const group = activityDisplayGroup(act.slug, act.category.slug);
    const list = catalogByGroup.get(group) ?? [];
    list.push({
      id: act.id,
      slug: act.slug,
      name: act.name,
      abbr: ACTIVITY_ABBR[act.slug] ?? act.name.slice(0, 4).toUpperCase(),
      unit: act.unit,
      direction: act.scoringDirection as ScoringDirection,
    });
    catalogByGroup.set(group, list);
  }

  return [...grades].sort((a, b) => a - b).map((grade) => {
    const enrolled = studentsByGrade.get(grade) ?? [];
    const groups: BoxScoreGroup[] = [];

    for (const groupKey of DISPLAY_GROUP_ORDER) {
      const groupActs = catalogByGroup.get(groupKey) ?? [];
      const rows: BoxScoreRow[] = [];

      for (const e of enrolled) {
        const marks = markByStudent.get(e.studentId);
        if (!marks) continue;
        const used: Record<string, BoxScoreMark> = {};
        let any = false;
        for (const act of groupActs) {
          const m = marks.get(act.slug);
          if (m) {
            used[act.slug] = m;
            any = true;
          }
        }
        if (!any) continue;
        rows.push({
          studentId: e.studentId,
          name: boxScoreName(e.student.firstName, e.student.lastName),
          fullName: `${e.student.firstName} ${e.student.lastName}`,
          marks: used,
        });
      }

      const visibleActs = groupActs.filter((act) => rows.some((row) => row.marks[act.slug]));
      if (visibleActs.length === 0 || rows.length === 0) continue;

      const sortAct = visibleActs[0]!;
      rows.sort((a, b) => {
        const av = a.marks[sortAct.slug]?.value;
        const bv = b.marks[sortAct.slug]?.value;
        if (av == null && bv == null) return a.name.localeCompare(b.name);
        if (av == null) return 1;
        if (bv == null) return -1;
        return sortAct.direction === "LOWER_BETTER" ? av - bv : bv - av;
      });

      const totals: Record<string, BoxScoreMark> = {};
      for (const act of visibleActs) {
        const values = rows.map((r) => r.marks[act.slug]?.value).filter((v): v is number => v != null);
        const mean = avg(values);
        if (mean == null) continue;
        totals[act.slug] = {
          value: mean,
          display: formatActivityValue(mean, act.unit, act.slug),
        };
      }

      groups.push({
        group: groupKey,
        label: DISPLAY_GROUP_LABELS[groupKey],
        activities: visibleActs,
        rows,
        totals,
      });
    }

    return { grade, groups };
  });
}
