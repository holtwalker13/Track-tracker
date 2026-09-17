import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Stock-style percentile change (higher percentile = green / up).
 */
export function PercentileTicker({
  percentile,
  previousPercentile,
  className,
}: {
  percentile: number;
  previousPercentile: number | null;
  className?: string;
}) {
  if (previousPercentile == null) {
    return (
      <span className={cn("text-xs text-muted", className)}>
        {percentile}th %ile · first tracked attempt
      </span>
    );
  }

  const delta = percentile - previousPercentile;
  const up = delta > 0;
  const down = delta < 0;
  const flat = delta === 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
        up && "bg-sport-green/20 text-sport-green",
        down && "bg-sport-red/20 text-sport-red",
        flat && "bg-card-border/40 text-muted",
        className
      )}
    >
      {up && <TrendingUp className="h-3.5 w-3.5" aria-hidden />}
      {down && <TrendingDown className="h-3.5 w-3.5" aria-hidden />}
      <span>{percentile}th %ile</span>
      {!flat && (
        <span>
          ({up ? "+" : ""}
          {delta} vs last)
        </span>
      )}
      {flat && <span>(unchanged)</span>}
    </span>
  );
}
