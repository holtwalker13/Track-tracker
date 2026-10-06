import { Target } from "lucide-react";
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

export function SprintPotentialCard({
  potential,
  ranks,
  highlightSlug,
}: {
  potential: SprintPotential;
  ranks?: Record<string, number>;
  highlightSlug?: string;
}) {
  const { matched, next, bands } = potential;
  const display = next ?? matched;
  if (!display && bands.every((b) => b.tested === 0)) {
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

  const earnedMedal = matched?.band.medal;
  const earnedClass =
    earnedMedal === "gold"
      ? "text-sport-gold"
      : earnedMedal === "silver"
        ? "text-sport-silver"
        : earnedMedal === "bronze"
          ? "text-sport-bronze"
          : "text-muted";

  const target = next ?? matched;
  const targetMedal = target?.band.medal;
  const targetTone =
    targetMedal === "gold" || targetMedal === "silver" || targetMedal === "bronze"
      ? targetMedal
      : "accent";

  return (
    <Card>
      <CardTitle>Medal standard</CardTitle>
      {earnedMedal ? (
        <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted">
          Earned{" "}
          <span className={earnedClass}>{MEDAL_LABELS[earnedMedal]}</span>
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted">No full medal earned yet.</p>
      )}
      {target && (
        <>
          <h2
            className={`mt-3 text-3xl font-bold ${
              targetMedal === "gold"
                ? "text-sport-gold"
                : targetMedal === "silver"
                  ? "text-sport-silver"
                  : targetMedal === "bronze"
                    ? "text-sport-bronze"
                    : "text-accent"
            }`}
          >
            {next ? `Target: ${MEDAL_LABELS[target.band.medal]}` : MEDAL_LABELS[target.band.medal]}
          </h2>
          <KpiScoreMeter
            hits={target.hits}
            tested={target.rows.length}
            label={`${target.band.label} ranked KPIs`}
            tone={targetTone}
          />
        </>
      )}

      {target && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3">
          {target.rows.map((row) => {
            const meta = KPI_METRIC_META.find((m) => m.slug === row.slug);
            const unit = meta?.unit ?? "";
            const mark =
              row.athlete == null
                ? "—"
                : formatActivityValue(row.athlete, unit, row.slug);
            const targetVal =
              row.target != null ? formatActivityValue(row.target, unit, row.slug) : "—";
            const rank = ranks?.[row.slug];
            const highlighted = highlightSlug === row.slug;
            return (
              <div
                key={row.slug}
                className={cn(
                  "relative rounded-xl border bg-background/60 px-2.5 py-2 sm:rounded-2xl sm:px-4 sm:py-3",
                  highlighted
                    ? "border-sky-400 ring-1 ring-sky-400/40"
                    : "border-card-border",
                  rank != null && "pr-8 sm:pr-10"
                )}
              >
                {rank != null && (
                  <div className="absolute right-1.5 top-1.5 flex flex-col items-end sm:right-2 sm:top-2">
                    <span
                      className={cn(
                        "text-xs font-bold leading-none tabular-nums sm:text-sm",
                        highlighted ? "text-sky-300" : "text-sky-300/90"
                      )}
                      aria-label={`School rank ${rank}`}
                    >
                      {rank}
                    </span>
                    <span className="mt-0.5 text-[7px] font-semibold uppercase tracking-wider text-muted sm:text-[8px]">
                      School
                    </span>
                  </div>
                )}
                <div className="flex min-w-0 items-baseline gap-1.5 pr-0.5">
                  <p className="truncate text-xl font-bold leading-none tabular-nums tracking-tight sm:text-2xl">
                    {mark}
                  </p>
                  {row.hit === true && (
                    <span className="shrink-0 text-[10px] font-semibold text-success sm:text-xs">hit</span>
                  )}
                  {row.hit === false && (
                    <span className="shrink-0 text-[10px] font-semibold text-warning sm:text-xs">gap</span>
                  )}
                </div>
                <p className="mt-1 flex items-center gap-1 text-xs leading-none tabular-nums text-muted sm:mt-1.5 sm:gap-1.5 sm:text-sm">
                  {targetVal}
                  <Target className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
                </p>
                <p className="mt-1 text-xs font-bold leading-tight text-muted sm:text-sm">
                  {row.name ?? meta?.name ?? row.slug}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
