import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { STUDENT_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { getStudentSprintPotential } from "@/lib/queries/kpi";
import { SprintPotentialCard } from "@/components/performance/sprint-potential";
import { Card, CardTitle } from "@/components/ui/card";
import { formatActivityValue } from "@/lib/format";
import { KPI_METRIC_META } from "@/lib/kpi-targets";

export default async function ProjectionPage() {
  const session = await requireSession(["STUDENT"]);
  if (!session?.studentId) redirect("/login");

  const potential = await getStudentSprintPotential(session.studentId);
  const next = potential.next;

  return (
    <AppShell title="Projection" nav={STUDENT_NAV}>
      <p className="mb-4 text-sm text-muted">
        These are training targets, not a race prediction. If you hit the KPI marks for a band, you
        can likely run that 100m / 40-yard time.
      </p>
      <SprintPotentialCard potential={potential} />
      {next && (
        <Card className="mt-6">
          <CardTitle>Gaps to {next.band.label}</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Associated times: {next.band.hundredMeter.toFixed(1)}s 100m · {next.band.fortyYard.toFixed(2)}s
            40yd
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {next.rows.map((row) => {
              const meta = KPI_METRIC_META.find((m) => m.slug === row.slug)!;
              if (row.athlete == null) {
                return (
                  <li key={row.slug} className="flex justify-between text-muted">
                    <span>{row.name}</span>
                    <span>not tested</span>
                  </li>
                );
              }
              const gap = row.direction === "HIGHER_BETTER" ? row.target - row.athlete : row.athlete - row.target;
              return (
                <li key={row.slug} className="flex justify-between">
                  <span>{row.name}</span>
                  <span className="tabular-nums">
                    {row.hit
                      ? "on target"
                      : `${formatActivityValue(Math.abs(gap), meta.unit, row.slug)} to go`}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </AppShell>
  );
}
