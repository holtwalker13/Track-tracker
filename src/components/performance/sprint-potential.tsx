import { formatActivityValue } from "@/lib/format";
import { KPI_METRIC_META, MEDAL_LABELS, type SprintPotential } from "@/lib/kpi-targets";
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function KpiScoreMeter({
  hits,
  tested,
  label,
  tone = "muted",
}: {
  hits: number;
  tested: number;
  label: string;
  tone?: "muted" | "accent" | "gold" | "silver" | "bronze";
}) {
  const total = Math.max(tested, 1);
  const filled = Math.min(hits, total);
  const fillClass =
    tone === "gold"
      ? "bg-sport-gold"
      : tone === "silver"
        ? "bg-sport-silver"
        : tone === "bronze"
          ? "bg-sport-bronze"
          : tone === "accent"
            ? "bg-accent"
            : "bg-sky-400";

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted">{label}</p>
        <p className="text-sm font-semibold tabular-nums text-foreground">
          {hits}
          <span className="mx-1 text-muted">of</span>
          {tested}
        </p>
      </div>
      <div className="flex items-center gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-2.5 w-2.5 rounded-full ring-1 ring-white/10",
              i < filled ? fillClass : "bg-background"
            )}
          />
        ))}
      </div>
    </div>
  );
}

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
  const meterTone =
    medal === "gold" || medal === "silver" || medal === "bronze" ? medal : "muted";

  return (
    <Card>
      <CardTitle>Medal standard</CardTitle>
      {matched && (
        <p className={`mt-4 text-3xl font-bold ${medalClass}`}>
          {MEDAL_LABELS[matched.band.medal]}
        </p>
      )}
      {matched && (
        <KpiScoreMeter
          hits={matched.hits}
          tested={matched.tested}
          label={`${matched.band.label} KPIs`}
          tone={meterTone}
        />
      )}
      {next && (
        <div className="mt-4 border-t border-card-border pt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Next</p>
          <KpiScoreMeter
            hits={next.hits}
            tested={next.tested}
            label={next.band.label}
            tone="accent"
          />
        </div>
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
