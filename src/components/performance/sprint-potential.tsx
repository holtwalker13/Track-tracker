import { formatActivityValue } from "@/lib/format";
import { KPI_METRIC_META, MEDAL_LABELS, type SprintPotential } from "@/lib/kpi-targets";
import { Card, CardTitle } from "@/components/ui/card";

export function SprintPotentialCard({ potential }: { potential: SprintPotential }) {
  const { matched, next, bands } = potential;
  if (!matched && bands.every((b) => b.tested === 0)) {
    return (
      <Card>
        <CardTitle>Medal standard</CardTitle>
        <p className="mt-3 text-sm text-muted">
          No flying-10, jump, lift, or sprint KPIs recorded yet. When those are in, they map to
          Gold / Silver / Bronze for this school.
        </p>
      </Card>
    );
  }

  const medal = matched?.band.medal;
  const medalClass =
    medal === "gold"
      ? "text-sport-gold"
      : medal === "silver"
        ? "text-sport-silver"
        : "text-sport-bronze";

  return (
    <Card>
      <CardTitle>Medal standard</CardTitle>
      <p className="mt-2 text-sm text-muted">
        School training bands — Gold is the top standard, Bronze is the entry standard. Coaches set
        the numbers for this school.
      </p>
      {matched && (
        <p className={`mt-4 text-3xl font-bold ${medalClass}`}>
          {MEDAL_LABELS[matched.band.medal]}
        </p>
      )}
      {matched && (
        <p className="mt-1 text-sm text-muted">
          {matched.hits}/{matched.tested} KPIs at {matched.band.label}
        </p>
      )}
      {next && (
        <p className="mt-1 text-sm text-accent">
          Next: {next.band.label} ({next.hits}/{next.tested} KPIs there)
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
