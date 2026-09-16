import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { calculateCategoryScores } from "@/lib/services/category-score";
import type { ScoringDirection } from "@/lib/constants";
import { GradePills } from "@/components/ui/filter-pills";
import { GenderToggle } from "@/components/ui/gender-toggle";
import { gradesFromSearch, gradesLabel, isAllGrades } from "@/lib/grades";
import { parseGenderParam, genderFullLabel } from "@/lib/gender";
import { getGradeBoxScores } from "@/lib/queries/box-score";
import { BoxScoreBoard } from "@/components/stats/box-score";

const COVERAGE_SLUGS = [
  "vertical-jump",
  "standing-broad-jump",
  "pull-ups",
  "100-meter-dash",
];

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; grades?: string; gender?: string }>;
}) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) redirect("/login");
  const sp = await searchParams;
  const grades = gradesFromSearch(sp);
  const gender = parseGenderParam(sp.gender);
  const gradeFilter = isAllGrades(grades) ? undefined : { in: grades };
  const genderFilter = { gender };

  const currentYear = await prisma.schoolYear.findFirst({
    where: { schoolId: session.schoolId, isCurrent: true },
  });

  const results = currentYear
    ? await prisma.performanceResult.findMany({
        where: {
          schoolId: session.schoolId,
          schoolYearId: currentYear.id,
          ...(gradeFilter ? { gradeLevel: gradeFilter } : {}),
          status: "COMPLETED",
          isBestAttempt: true,
          student: genderFilter,
        },
        include: { activity: { include: { category: true } } },
      })
    : [];

  const byActivity = new Map<string, number[]>();
  for (const r of results) {
    if (r.resultValue == null) continue;
    const list = byActivity.get(r.activityId) ?? [];
    list.push(r.resultValue);
    byActivity.set(r.activityId, list);
  }

  const items = [];
  for (const [activityId, values] of byActivity) {
    const sample = results.find((r) => r.activityId === activityId)!;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const bench = await prisma.benchmarkValue.findFirst({
      where: { activityId, gradeLevel: sample.gradeLevel },
    });
    if (!bench) continue;
    items.push({
      categorySlug: sample.activity.category.slug,
      categoryName: sample.activity.category.name,
      value: avg,
      benchmark: bench,
      direction: sample.activity.scoringDirection as ScoringDirection,
    });
  }

  const categories = calculateCategoryScores(items);

  const activities = await prisma.activity.findMany({
    where: { slug: { in: COVERAGE_SLUGS } },
  });

  const coverage = currentYear
    ? await Promise.all(
        activities.map(async (act) => {
          const enrolled = await prisma.studentEnrollment.count({
            where: {
              schoolYearId: currentYear.id,
              ...(gradeFilter ? { gradeLevel: gradeFilter } : {}),
              student: genderFilter,
            },
          });
          const tested = await prisma.performanceResult.groupBy({
            by: ["studentId"],
            where: {
              activityId: act.id,
              schoolYearId: currentYear.id,
              ...(gradeFilter ? { gradeLevel: gradeFilter } : {}),
              status: "COMPLETED",
              isBestAttempt: true,
              student: genderFilter,
            },
          });
          const pct = enrolled ? Math.round((tested.length / enrolled) * 100) : 0;
          return { name: act.name, slug: act.slug, pct, missing: enrolled - tested.length };
        })
      )
    : [];

  const boxScores = await getGradeBoxScores(session.schoolId, grades, gender);

  return (
    <AppShell title="Analytics" nav={COACH_NAV}>
      <div className="mb-6 space-y-4">
        <GradePills />
        <GenderToggle />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>
            {gradesLabel(grades)} {genderFullLabel(gender).toLowerCase()} profile
          </CardTitle>
          <ul className="mt-4 space-y-3">
            {categories.map((c) => (
              <li key={c.categorySlug} className="flex justify-between">
                <span>{c.categoryName}</span>
                <span className="font-bold tabular-nums">{c.score}th percentile</span>
              </li>
            ))}
            {categories.length === 0 && (
              <li className="text-sm text-muted">No completed tests for this filter.</li>
            )}
          </ul>
        </Card>
        <Card>
          <CardTitle>Testing coverage</CardTitle>
          <ul className="mt-4 space-y-3">
            {coverage.map((c) => (
              <li key={c.name}>
                <div className="flex justify-between text-sm">
                  <span>{c.name}</span>
                  <span>{c.pct}% complete</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-card-border">
                  <div className="h-2 rounded-full bg-foreground/80" style={{ width: `${c.pct}%` }} />
                </div>
                {c.missing > 0 && (
                  <p className="mt-1 text-xs text-muted">{c.missing} students missing</p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">
        Top athlete scores
      </h2>
      <BoxScoreBoard
        grades={boxScores}
        gender={gender}
        hrefForStudent={(id) => `/coach/students/${id}`}
      />
    </AppShell>
  );
}
