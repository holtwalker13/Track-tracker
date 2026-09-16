export function PercentileBar({
  percentile,
  p50,
  p75,
  p90,
  studentValue,
  unit,
}: {
  percentile: number;
  p50: number;
  p75?: number;
  p90?: number;
  studentValue: number;
  unit: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted">
        <span>50th — {p50}{unit === "inches" ? '"' : ` ${unit}`}</span>
        {p75 != null && <span>75th — {p75}</span>}
        {p90 != null && <span>90th — {p90}</span>}
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-card-border">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-accent/40"
          style={{ width: `${Math.min(100, percentile)}%` }}
        />
        <div
          className="absolute top-0 h-full w-1 bg-accent"
          style={{ left: `${Math.min(98, percentile)}%` }}
        />
      </div>
      <p className="text-sm">
        <span className="font-semibold text-accent">{percentile}th percentile</span>
        <span className="text-muted"> · You: {studentValue}</span>
      </p>
    </div>
  );
}
