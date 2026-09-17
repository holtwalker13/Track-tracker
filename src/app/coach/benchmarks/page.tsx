import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { ALL_KPI_BANDS, KPI_METRIC_META } from "@/lib/kpi-targets";
import { formatActivityValue } from "@/lib/format";

export default async function BenchmarksPage() {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) redirect("/login");

  const female = ALL_KPI_BANDS.filter((b) => b.gender === "F");
  const male = ALL_KPI_BANDS.filter((b) => b.gender === "M");

  return (
    <AppShell title="KPI targets" nav={COACH_NAV}>
      <p className="mb-6 max-w-3xl text-sm text-muted">
        If an athlete hits these KPI scores they can likely run the matching 100m / 40-yard time.
        Female numbers come from the JHS Athletics KPI database. Male numbers keep the same
        structure and are a synthetic analog (no boy sheet was provided).
      </p>
      <KpiTable title="Girls" bands={female} />
      <KpiTable title="Boys (synthetic analog)" bands={male} />
    </AppShell>
  );
}

function KpiTable({
  title,
  bands,
}: {
  title: string;
  bands: typeof ALL_KPI_BANDS;
}) {
  return (
    <Card className="mb-6 overflow-x-auto">
      <CardTitle>{title}</CardTitle>
      <table className="mt-4 w-full min-w-[40rem] text-left text-sm">
        <thead>
          <tr className="border-b border-card-border text-muted">
            <th className="py-2 pr-3 font-medium">Metric</th>
            {bands.map((b) => (
              <th key={b.id} className="py-2 pr-3 font-medium">
                {b.hundredMeter.toFixed(1)}s 100m
                <span className="mt-0.5 block text-xs font-normal">
                  {b.fortyYard.toFixed(2)}s 40yd
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {KPI_METRIC_META.map((meta) => (
            <tr key={meta.slug} className="border-b border-card-border/60">
              <td className="py-2 pr-3 font-medium">{meta.name}</td>
              {bands.map((b) => (
                <td key={b.id} className="py-2 pr-3 tabular-nums">
                  {formatActivityValue(b.targets[meta.slug], meta.unit, meta.slug)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
