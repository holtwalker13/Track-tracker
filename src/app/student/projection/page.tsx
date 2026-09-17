import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { STUDENT_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { getStudentContext, getProgressSeries } from "@/lib/queries/student";
import { calculateProjection } from "@/lib/services/projection";
import { prisma } from "@/lib/db";

export default async function ProjectionPage() {
  const session = await requireSession(["STUDENT"]);
  if (!session?.studentId) redirect("/login");

  const { currentGrade } = await getStudentContext(session.studentId);
  const targetGrade = Math.min(12, currentGrade + 3);
  const series = await getProgressSeries(session.studentId, "vertical-jump");
  const activity = await prisma.activity.findUnique({
    where: { slug: "vertical-jump" },
  });

  const benchRows = activity
    ? await prisma.benchmarkValue.findMany({
        where: { activityId: activity.id },
        orderBy: { gradeLevel: "asc" },
      })
    : [];

  const data = series?.data ?? [];
  const currentVal = data[data.length - 1]?.value ?? 18;
  const trend =
    data.length >= 2
      ? (data[data.length - 1].value - data[0].value) / (data.length - 1)
      : undefined;

  const projection = calculateProjection({
    currentGrade,
    targetGrade,
    currentValue: currentVal,
    benchmarkByGrade: benchRows
      .filter((b) => b.gradeLevel != null)
      .map((b) => ({ gradeLevel: b.gradeLevel!, p50: b.p50 })),
    studentTrendPerGrade: trend,
  });

  return (
    <AppShell title="Projection" nav={STUDENT_NAV}>
      <p className="mb-4 text-sm text-muted">{projection.disclaimer}</p>
      <Card>
        <CardTitle>
          Vertical jump — grade {currentGrade} → {targetGrade}
        </CardTitle>
        <p className="mt-2 text-muted">Current: {currentVal.toFixed(1)}</p>
        <h3 className="mt-6 text-sm font-medium text-muted">Typical benchmark trajectory</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {projection.benchmarkTrajectory
            .filter((b) => b.gradeLevel >= currentGrade && b.gradeLevel <= targetGrade)
            .map((b) => (
              <li key={b.gradeLevel}>
                Grade {b.gradeLevel}: {b.p50.toFixed(1)}
              </li>
            ))}
        </ul>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {Object.entries(projection.scenarios).map(([key, s]) => (
            <div key={key} className="rounded-lg border border-card-border p-4">
              <p className="text-xs uppercase text-muted">{s.label}</p>
              <p className="mt-2 text-2xl font-bold text-accent">
                {s.value.toFixed(1)}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
