import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { XpProgressBar } from "@/components/gamification/xp-progress-bar";

export type GamificationSummaryProps = {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  lifetimeXp: number;
  currentStreak: number;
  prCount: number;
  improvementPct: number;
  recentAccolades: {
    slug: string;
    name: string;
    emoji: string;
    description: string;
    earnedAt: Date;
    metadata?: unknown;
  }[];
  almostThere?: {
    slug: string;
    name: string;
    emoji: string;
    progressCurrent: number;
    progressTarget: number;
    progressLabel: string;
  }[];
};

export function GamificationSummaryCard({
  level,
  xpIntoLevel,
  xpForNextLevel,
  currentStreak,
  prCount,
  improvementPct,
  recentAccolades,
  almostThere = [],
}: GamificationSummaryProps) {
  return (
    <Card className="mt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardTitle>Your progress</CardTitle>
        <Link
          href="/student/accolades"
          className="text-sm font-medium text-accent hover:underline"
        >
          All accolades
        </Link>
      </div>

      <div className="mt-4">
        <XpProgressBar level={level} xpIntoLevel={xpIntoLevel} xpForNextLevel={xpForNextLevel} />
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <span>🔥 {currentStreak} streak</span>
        <span>🏆 {prCount} PRs</span>
        <span>📈 +{improvementPct}% improvement</span>
      </div>

      {recentAccolades.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Recent accolades
          </p>
          <ul className="mt-3 space-y-3">
            {recentAccolades.map((a) => (
              <li key={a.slug + a.earnedAt.toISOString()} className="rounded-xl bg-background/60 p-3">
                <p className="font-semibold">
                  {a.emoji} {a.name}
                </p>
                <p className="text-sm text-muted">{a.description}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {almostThere.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Almost there</p>
          <ul className="mt-3 space-y-4">
            {almostThere.map((a) => {
              const pct = Math.min(
                100,
                Math.round((a.progressCurrent / a.progressTarget) * 100)
              );
              const remaining = Math.max(0, a.progressTarget - a.progressCurrent);
              return (
                <li key={a.slug}>
                  <p className="font-semibold">
                    {a.emoji} {a.name}
                  </p>
                  <p className="text-sm text-muted">{a.progressLabel}</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-card-border/40">
                    <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                  </div>
                  {a.progressTarget > a.progressCurrent && (
                    <p className="mt-1 text-xs text-muted">
                      {remaining}{" "}
                      {a.slug.startsWith("club-")
                        ? "lbs to go"
                        : a.slug.includes("workout")
                          ? "workouts to go"
                          : "to go"}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}
