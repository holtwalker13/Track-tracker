import Link from "next/link";
import { Flame, TrendingUp, Trophy } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { XpProgressBar } from "@/components/gamification/xp-progress-bar";
import { AccoladeIcon } from "@/components/gamification/accolade-icon";
import { GamificationStatChip } from "@/components/gamification/gamification-stat-chip";
import type { AccoladeCategory } from "@/lib/gamification/accolade-definitions";
import { themeForAccoladeCategory } from "@/lib/gamification/accolade-theme";
import { cn } from "@/lib/utils";

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
    category: string;
    description: string;
    earnedAt: Date;
    metadata?: unknown;
  }[];
  almostThere?: {
    slug: string;
    name: string;
    category: string;
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
  const consistencyTheme = themeForAccoladeCategory("consistency");
  const prTheme = themeForAccoladeCategory("prs");
  const impTheme = themeForAccoladeCategory("improvement");

  return (
    <Card className="mt-6 overflow-hidden border-accent/20 bg-gradient-to-br from-card via-card to-accent/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardTitle className="text-accent">Your progress</CardTitle>
        <Link
          href="/student/accolades"
          className="text-sm font-semibold text-sport-gold hover:underline"
        >
          All accolades
        </Link>
      </div>

      <div className="mt-4">
        <XpProgressBar level={level} xpIntoLevel={xpIntoLevel} xpForNextLevel={xpForNextLevel} />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <GamificationStatChip
          icon={Flame}
          label="Streak"
          value={currentStreak}
          toneClass={consistencyTheme.chipText}
          chipBg={consistencyTheme.chipBg}
        />
        <GamificationStatChip
          icon={Trophy}
          label="PRs"
          value={prCount}
          toneClass={prTheme.chipText}
          chipBg={prTheme.chipBg}
        />
        <GamificationStatChip
          icon={TrendingUp}
          label="Improvement"
          value={`+${improvementPct}%`}
          toneClass={impTheme.chipText}
          chipBg={impTheme.chipBg}
        />
      </div>

      {recentAccolades.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Recent accolades
          </p>
          <ul className="mt-3 space-y-3">
            {recentAccolades.map((a) => {
              const cat = a.category as AccoladeCategory;
              const theme = themeForAccoladeCategory(cat);
              return (
                <li
                  key={a.slug + a.earnedAt.toISOString()}
                  className={cn(
                    "flex gap-3 rounded-xl border p-3",
                    theme.cardBorder,
                    theme.cardBg
                  )}
                >
                  <AccoladeIcon slug={a.slug} category={cat} earned size="sm" />
                  <div>
                    <p className={cn("font-semibold", theme.sectionAccent)}>{a.name}</p>
                    <p className="text-sm text-muted">{a.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {almostThere.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Almost there</p>
          <ul className="mt-3 space-y-4">
            {almostThere.map((a) => {
              const cat = a.category as AccoladeCategory;
              const theme = themeForAccoladeCategory(cat);
              const pct = Math.min(
                100,
                Math.round((a.progressCurrent / a.progressTarget) * 100)
              );
              const remaining = Math.max(0, a.progressTarget - a.progressCurrent);
              return (
                <li key={a.slug} className="flex gap-3">
                  <AccoladeIcon slug={a.slug} category={cat} earned={false} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-semibold", theme.sectionAccent)}>{a.name}</p>
                    <p className="text-sm text-muted">{a.progressLabel}</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-card-border/40">
                      <div
                        className={cn("h-full rounded-full", theme.progressBar)}
                        style={{ width: `${pct}%` }}
                      />
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
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}
