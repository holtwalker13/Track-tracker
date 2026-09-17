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
import { classYearLabel, singleGradeFromSearch } from "@/lib/grades";
import { parseGenderParam, genderFullLabel } from "@/lib/gender";
import { getGradeBoxScores } from "@/lib/queries/box-score";
import { BoxScoreBoard } from "@/components/stats/box-score";
import { getPeerBenchmark } from "@/lib/queries/benchmarks";

const COVERAGE_SLUGS = [
  "flying-10-meter",
  "standing-broad-jump",
  "vertical-jump",
  "squat",
  "40-yard-dash",
];

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; grades?: string; gender?: string }>;
}) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) redirect("/login");
  const sp = await searchParams;
  const grade = singleGradeFromSearch(sp);
  const grades = [grade];
  const gender = parseGenderParam(sp.gender);
  const genderFilter = { gender };

  const currentYear = await prisma.schoolYear.findFirst({
    where: { schoolId: session.schoolId, isCurrent: true },
  });

  const results = currentYear
    ? await prisma.performanceResult.findMany({
        where: {
          schoolId: session.schoolId,
          schoolYearId: currentYear.id,
          gradeLevel: grade,
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
    const bench = await getPeerBenchmark(
      activityId,
      sample.gradeLevel,
      sample.activity.scoringDirection as ScoringDirection
    );
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
              gradeLevel: grade,
              student: genderFilter,
            },
          });
          const tested = await prisma.performanceResult.groupBy({
            by: ["studentId"],
            where: {
              activityId: act.id,
              schoolYearId: currentYear.id,
              gradeLevel: grade,
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
      <div className="mb-8 space-y-5">
        <div>
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            Class
          </p>
          <div className="flex justify-center">
            <GradePills mode="single" />
          </div>
        </div>
        <GenderToggle />
        <p className="text-center text-sm text-muted">
          {classYearLabel(grade)} · {genderFullLabel(gender)} · current year box score
        </p>
      </div>

      <div className="mb-10 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardTitle>Athletic profile</CardTitle>
          <ul className="mt-4 space-y-2.5">
            {categories.map((c) => (
              <li key={c.categorySlug} className="flex justify-between text-sm">
                <span>{c.categoryName}</span>
                <span className="font-bold tabular-nums">{c.score}th</span>
              </li>
            ))}
            {categories.length === 0 && (
              <li className="text-sm text-muted">No completed tests for this group.</li>
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
                  <span className="tabular-nums">{c.pct}%</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-card-border">
                  <div className="h-1.5 rounded-full bg-sky-500" style={{ width: `${c.pct}%` }} />
                </div>
                {c.missing > 0 && (
                  <p className="mt-1 text-xs text-muted">{c.missing} missing</p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <BoxScoreBoard
        grades={boxScores}
        gender={gender}
        hrefForStudent={(id) => `/coach/students/${id}`}
      />
    </AppShell>
  );
}
