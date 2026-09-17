import { formatActivityValue } from "@/lib/format";
import { KPI_METRIC_META, type SprintPotential } from "@/lib/kpi-targets";
import { Card, CardTitle } from "@/components/ui/card";

export function SprintPotentialCard({ potential }: { potential: SprintPotential }) {
  const { matched, next, bands } = potential;
  if (!matched && bands.every((b) => b.tested === 0)) {
    return (
      <Card>
        <CardTitle>Sprint KPI potential</CardTitle>
        <p className="mt-3 text-sm text-muted">
          No flying-10, jump, lift, or sprint KPIs recorded yet. When those hits are in, they map
          to a likely 100m / 40-yard time.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>Sprint KPI potential</CardTitle>
      <p className="mt-2 text-sm text-muted">
        Hitting these targets is associated with a 100m and 40-yard time — not a guaranteed race
        result.
      </p>
      {matched && (
        <p className="mt-4 text-2xl font-bold tabular-nums">
          {matched.band.hundredMeter.toFixed(1)}s{" "}
          <span className="text-lg font-semibold text-muted">100m</span>
          <span className="mx-2 text-card-border">·</span>
          {matched.band.fortyYard.toFixed(2)}s{" "}
          <span className="text-lg font-semibold text-muted">40yd</span>
        </p>
      )}
      {matched && (
        <p className="mt-1 text-sm text-muted">
          {matched.hits}/{matched.tested} KPIs at the {matched.band.label} standard
        </p>
      )}
      {next && (
        <p className="mt-1 text-sm text-accent">
          Next band: {next.band.hundredMeter.toFixed(1)}s 100m / {next.band.fortyYard.toFixed(2)}s
          40yd ({next.hits}/{next.tested} KPIs there)
        </p>
      )}

      {matched && (
        <ul className="mt-5 space-y-2 text-sm">
          {matched.rows.map((row) => {
            const meta = KPI_METRIC_META.find((m) => m.slug === row.slug)!;
            return (
              <li key={row.slug} className="flex items-baseline justify-between gap-3">
                <span className="text-muted">{row.name}</span>
                <span className="tabular-nums">
                  {row.athlete == null
                    ? "—"
                    : formatActivityValue(row.athlete, meta.unit, row.slug)}
                  <span className="mx-1 text-card-border">/</span>
                  <span className="text-muted">
                    {formatActivityValue(row.target, meta.unit, row.slug)}
                  </span>
                  {row.hit === true && <span className="ml-2 text-success">hit</span>}
                  {row.hit === false && <span className="ml-2 text-warning">gap</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
