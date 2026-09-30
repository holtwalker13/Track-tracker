import { Card, CardTitle } from "@/components/ui/card";
import { AccoladeIcon } from "@/components/gamification/accolade-icon";
import type { AccoladeCategory } from "@/lib/gamification/accolade-definitions";
import { themeForAccoladeCategory } from "@/lib/gamification/accolade-theme";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

export function AccoladeProgressCard({
  slug,
  name,
  description,
  category,
  earned,
  earnedAt,
  progressLabel,
  progressCurrent,
  progressTarget,
}: {
  slug: string;
  name: string;
  description: string;
  category: string;
  earned: boolean;
  earnedAt?: Date;
  progressLabel?: string;
  progressCurrent?: number;
  progressTarget?: number;
}) {
  const cat = category as AccoladeCategory;
  const theme = themeForAccoladeCategory(cat);
  const pct =
    progressCurrent != null && progressTarget != null && progressTarget > 0
      ? Math.min(100, Math.round((progressCurrent / progressTarget) * 100))
      : 0;

  return (
    <Card
      className={cn(
        "overflow-hidden border-2 transition-colors",
        earned ? theme.cardBorder : "border-card-border/80",
        earned ? theme.cardBg : "bg-card/80"
      )}
    >
      <div className="flex gap-3">
        <AccoladeIcon slug={slug} category={cat} earned={earned} size="md" />
        <div className="min-w-0 flex-1">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <span>{name}</span>
            {!earned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-card-border/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                <Lock className="h-3 w-3" aria-hidden />
                Locked
              </span>
            )}
          </CardTitle>
          <p className="mt-1 text-sm text-muted">{description}</p>
          {earned && earnedAt && (
            <p className={cn("mt-2 text-xs font-semibold", theme.sectionAccent)}>
              Earned {earnedAt.toLocaleDateString()}
            </p>
          )}
          {!earned && progressLabel && (
            <>
              <p className="mt-3 text-sm font-semibold tabular-nums">{progressLabel}</p>
              {progressTarget != null && progressTarget > 0 && (
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-card-border/50">
                  <div
                    className={cn("h-full rounded-full transition-all", theme.progressBar)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
