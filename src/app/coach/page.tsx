import { AppShell } from "@/components/layout/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { getCoachDashboard } from "@/lib/queries/coach";
import Link from "next/link";

export default async function CoachDashboardPage() {
  const session = await requireSchoolSession();

  const data = await getCoachDashboard(session.schoolId);

  return (
    <AppShell title="Coach Dashboard" nav={COACH_NAV}>
      <p className="mb-6 text-muted">How are my students performing?</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Students tested", value: data.studentsTested },
          { label: "Testing sessions", value: data.sessions },
          { label: "Tests completed", value: data.testsCompleted },
          { label: "PRs this month", value: data.prsMonth },
          { label: "Students missing tests", value: data.missingCount },
        ].map((c) => (
          <Card key={c.label}>
            <CardTitle>{c.label}</CardTitle>
            <p className="mt-2 text-4xl font-bold tabular-nums text-accent">{c.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Recent testing sessions</CardTitle>
          <ul className="mt-4 space-y-3">
            {data.recentSessions.map((s) => (
              <li key={s.id} className="flex justify-between text-sm">
                <Link href={`/coach/testing/${s.id}`} className="hover:text-accent">
                  {s.name}
                </Link>
                <span className="text-muted">{s.schoolYear.label}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardTitle>Class leaders — vertical jump</CardTitle>
          <ul className="mt-4 space-y-2">
            {data.topPerformers.map((p, i) => (
              <li key={i} className="flex justify-between">
                <span>{i + 1}. {p.name}</span>
                <span className="font-mono text-accent">{p.value.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
