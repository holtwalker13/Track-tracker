import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export default async function BenchmarksPage() {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) redirect("/login");

  const datasets = await prisma.benchmarkDataset.findMany({
    include: { values: { take: 5, include: { activity: true } } },
  });

  return (
    <AppShell title="Benchmarks" nav={COACH_NAV}>
      <p className="mb-4 text-sm text-warning">
        Development datasets are synthetic and labeled — not validated for real-world use.
      </p>
      {datasets.map((d) => (
        <Card key={d.id} className="mb-4">
          <CardTitle>{d.name}</CardTitle>
          <p className="mt-2 text-sm text-muted">
            Source: {d.sourceName} · {d.datasetYear} · {d.population}
            {d.isSynthetic ? " · SYNTHETIC_DEV" : ""}
          </p>
          <p className="text-xs text-muted">{d.methodologyNotes}</p>
          <ul className="mt-4 text-sm">
            {d.values.map((v) => (
              <li key={v.id}>
                {v.activity.name} (grade {v.gradeLevel}): P50={v.p50}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </AppShell>
  );
}
