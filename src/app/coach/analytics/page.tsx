import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { calculateCategoryScores } from "@/lib/services/category-score";
import type { ScoringDirection } from "@/lib/constants";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string }>;
}) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) redirect("/login");
  const sp = await searchParams;
  const gradeLevel = sp.grade ? parseInt(sp.grade, 10) : 7;

  const currentYear = await prisma.schoolYear.findFirst({
    where: { schoolId: session.schoolId, isCurrent: true },
  });

  const results = currentYear
    ? await prisma.performanceResult.findMany({
        where: {
          schoolId: session.schoolId,
          schoolYearId: currentYear.id,
          gradeLevel,
          status: "COMPLETED",
          isBestAttempt: true,
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
      where: { activityId, gradeLevel },
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
    where: {
      slug: { in: ["vertical-jump", "standing-broad-jump", "pull-ups", "100-meter-dash"] },
    },
  });

  const coverage = await Promise.all(
    activities.map(async (act) => {
      const enrolled = await prisma.studentEnrollment.count({
        where: { schoolYearId: currentYear!.id, gradeLevel },
      });
      const tested = await prisma.performanceResult.groupBy({
        by: ["studentId"],
        where: {
          activityId: act.id,
          schoolYearId: currentYear!.id,
          gradeLevel,
          status: "COMPLETED",
          isBestAttempt: true,
        },
      });
      const pct = enrolled ? Math.round((tested.length / enrolled) * 100) : 0;
      return { name: act.name, pct, missing: enrolled - tested.length };
    })
  );

  return (
    <AppShell title="Analytics" nav={COACH_NAV}>
      <form className="mb-4">
        <select name="grade" defaultValue={String(gradeLevel)} className="rounded-lg border border-card-border bg-background px-3 py-2">
          {[6, 7, 8, 9, 10, 11, 12].map((g) => (
            <option key={g} value={g}>Grade {g}</option>
          ))}
        </select>
        <button type="submit" className="ml-2 rounded-lg bg-accent px-4 py-2 text-background">View</button>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Grade {gradeLevel} athletic profile (avg vs benchmark)</CardTitle>
          <ul className="mt-4 space-y-3">
            {categories.map((c) => (
              <li key={c.categorySlug} className="flex justify-between">
                <span>{c.categoryName}</span>
                <span className="font-bold text-accent">{c.score}th percentile</span>
              </li>
            ))}
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
                  <div className="h-2 rounded-full bg-accent" style={{ width: `${c.pct}%` }} />
                </div>
                {c.missing > 0 && (
                  <p className="mt-1 text-xs text-muted">{c.missing} students missing</p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
