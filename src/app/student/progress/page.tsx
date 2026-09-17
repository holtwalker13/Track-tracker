import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { STUDENT_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { getProgressSeries } from "@/lib/queries/student";
import { ProgressLine } from "@/components/charts/progress-line";

export default async function ProgressPage() {
  const session = await requireSession(["STUDENT"]);
  if (!session?.studentId) redirect("/login");

  const series = await getProgressSeries(session.studentId, "vertical-jump");

  if (!series) {
    return (
      <AppShell title="Progress" nav={STUDENT_NAV}>
        <p className="text-muted">No progress data yet.</p>
      </AppShell>
    );
  }

  const { activity, data, summary } = series;

  return (
    <AppShell title="Progress" nav={STUDENT_NAV}>
      <p className="mb-4 text-muted">How much have you improved?</p>
      <Card>
        <CardTitle>{activity.name}</CardTitle>
        <ul className="mt-4 space-y-1 text-sm">
          {data.map((d) => (
            <li key={d.label}>
              {d.label}: <strong>{d.value.toFixed(1)}</strong>
            </li>
          ))}
        </ul>
        {summary && summary.percent != null && (
          <p className="mt-4 text-lg text-accent">
            +{summary.absolute.toFixed(1)} ({summary.percent.toFixed(1)}% since first test)
          </p>
        )}
        <div className="mt-6">
          <ProgressLine data={data} unit={activity.unit} />
        </div>
        <p className="mt-4 text-sm text-muted">
          Only the current testing cycle is loaded, so this is a snapshot rather than a multi-year
          trend.
        </p>
      </Card>
    </AppShell>
  );
}
