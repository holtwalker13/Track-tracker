import type { ActivityDisplayGroup } from "@/lib/activity-groups";

/** Rank podium colors */
export function rankAccent(rank: number): string {
  if (rank === 1) return "text-sport-gold";
  if (rank === 2) return "text-sport-silver";
  if (rank === 3) return "text-sport-bronze";
  return "text-foreground";
}

export function rankBg(rank: number): string {
  if (rank === 1) return "bg-sport-gold/15 border-sport-gold/40";
  if (rank === 2) return "bg-sport-silver/10 border-sport-silver/30";
  if (rank === 3) return "bg-sport-bronze/15 border-sport-bronze/40";
  return "border-card-border/40";
}

export function groupAccent(group: ActivityDisplayGroup): string {
  switch (group) {
    case "running":
      return "border-sport-red/50 bg-sport-red/10";
    case "jumping":
      return "border-sport-gold/50 bg-sport-gold/10";
    default:
      return "border-sport-green/50 bg-sport-green/10";
  }
}

export type PercentileTier = {
  id: string;
  label: string;
  minPercentile: number;
  icon: "trophy" | "medal" | "star";
  colorClass: string;
};

export const PERCENTILE_TIERS: PercentileTier[] = [
  { id: "p90", label: "90th+", minPercentile: 90, icon: "trophy", colorClass: "text-sport-gold" },
  { id: "p75", label: "75th+", minPercentile: 75, icon: "trophy", colorClass: "text-sport-yellow" },
  { id: "starter", label: "Starter", minPercentile: 50, icon: "medal", colorClass: "text-sport-green" },
  { id: "developing", label: "Developing", minPercentile: 25, icon: "star", colorClass: "text-muted" },
  { id: "rookie", label: "Rookie", minPercentile: 0, icon: "star", colorClass: "text-muted" },
];

export function tierForPercentile(percentile: number): PercentileTier {
  return (
    PERCENTILE_TIERS.find((t) => percentile >= t.minPercentile) ??
    PERCENTILE_TIERS[PERCENTILE_TIERS.length - 1]
  );
}
