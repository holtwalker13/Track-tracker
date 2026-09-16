import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { STUDENT_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { getStudentContext, getStudentScorecard } from "@/lib/queries/student";
import { PercentileBar } from "@/components/charts/percentile-bar";
import { prisma } from "@/lib/db";

export default async function StudentPerformancePage() {
  const session = await requireSession(["STUDENT"]);
  if (!session?.studentId) redirect("/login");

  const { currentGrade } = await getStudentContext(session.studentId);
  const scorecard = await getStudentScorecard(session.studentId, currentGrade);

  const cards = await Promise.all(
    scorecard.map(async (c) => {
      const bench = await prisma.benchmarkValue.findFirst({
        where: { activityId: c.activity.id, gradeLevel: currentGrade },
      });
      return { c, bench };
    })
  );

  return (
    <AppShell title="My Performance" nav={STUDENT_NAV}>
      <div className="space-y-6">
        {cards.map(({ c, bench }) => (
          <Card key={c.activity.id}>
            <CardTitle>{c.activity.name}</CardTitle>
            <p className="mt-2 text-3xl font-bold">{c.display}</p>
            {bench && c.percentile != null && (
              <div className="mt-4">
                <PercentileBar
                  percentile={c.percentile}
                  p50={bench.p50}
                  p75={bench.p75 ?? undefined}
                  p90={bench.p90 ?? undefined}
                  studentValue={c.value}
                  unit={c.activity.unit}
                />
              </div>
            )}
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
