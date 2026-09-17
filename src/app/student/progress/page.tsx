import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { STUDENT_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getProgressByTestDate } from "@/lib/queries/student";
import { ProgressLine } from "@/components/charts/progress-line";
import { ActivityChartPicker } from "@/components/charts/activity-chart-picker";

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ activity?: string }>;
}) {
  const session = await requireSession(["STUDENT"]);
  if (!session?.studentId) redirect("/login");
  const sp = await searchParams;

  const catalog = await prisma.activity.findMany({
    where: { slug: { notIn: ["height", "weight"] } },
    orderBy: { name: "asc" },
    select: { slug: true, name: true },
  });
  const selected = catalog.some((a) => a.slug === sp.activity)
    ? sp.activity!
    : "vertical-jump";

  const series = await getProgressByTestDate(session.studentId, selected);

  return (
    <AppShell title="Progress" nav={STUDENT_NAV}>
      <p className="mb-4 text-muted">Marks by test date. Each live testing day is a point on the line.</p>
      <ActivityChartPicker activities={catalog} selected={selected} />
      {!series || series.data.length === 0 ? (
        <p className="text-sm text-muted">No tests for this event yet.</p>
      ) : (
        <Card>
          <CardTitle>{series.activity.name}</CardTitle>
          {series.summary && series.summary.percent != null && (
            <p className="mt-4 text-lg text-accent">
              {series.summary.absolute >= 0 ? "+" : ""}
              {series.summary.absolute.toFixed(1)} since first dated test
            </p>
          )}
          <div className="mt-6">
            <ProgressLine data={series.data} unit={series.activity.unit} />
          </div>
        </Card>
      )}
    </AppShell>
  );
}
