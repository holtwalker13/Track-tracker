import { Medal, Star, Trophy } from "lucide-react";
import { tierForPercentile } from "@/lib/sport-theme";

export function PercentileTierBadge({ percentile }: { percentile: number }) {
  const tier = tierForPercentile(percentile);
  const Icon =
    tier.icon === "trophy" ? Trophy : tier.icon === "medal" ? Medal : Star;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-card-border bg-background/60 px-2 py-0.5 text-xs font-medium ${tier.colorClass}`}
      title={`${tier.label} — ${percentile}th percentile`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {tier.label}
    </span>
  );
}
