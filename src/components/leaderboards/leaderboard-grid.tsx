import { Card, CardTitle } from "@/components/ui/card";
import { ActivityIcon } from "@/lib/activity-icons";
import { formatActivityValue } from "@/lib/format";
import { groupAccent, rankAccent, rankBg } from "@/lib/sport-theme";
import { PercentileTierBadge } from "@/components/performance/percentile-tier-badge";
import type { LeaderboardBoard } from "@/lib/queries/leaderboard-grid";
import { Trophy } from "lucide-react";

export function LeaderboardGrid({
  boards,
  subtitle,
}: {
  boards: LeaderboardBoard[];
  subtitle?: string;
}) {
  return (
    <div>
      {subtitle && <p className="mb-4 text-sm text-muted">{subtitle}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {boards.map((board) => (
          <Card
            key={board.activity.id}
            className={`border-2 ${groupAccent(board.group)}`}
          >
            <div className="flex items-center gap-2">
              <ActivityIcon
                slug={board.activity.slug}
                categorySlug={board.activity.category?.slug}
                className="h-6 w-6"
              />
              <CardTitle className="!text-base">{board.activity.name}</CardTitle>
            </div>
            {board.entries.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No results yet</p>
            ) : (
              <ol className="mt-3 space-y-1.5">
                {board.entries.map((e) => (
                  <li
                    key={e.rank}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-sm ${rankBg(e.rank)}`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={`flex w-8 items-center gap-0.5 font-bold tabular-nums ${rankAccent(e.rank)}`}
                      >
                        {e.rank <= 3 && <Trophy className="h-4 w-4 shrink-0" aria-hidden />}
                        {e.rank}
                      </span>
                      {e.displayName === "You" && (
                        <span className="rounded bg-accent/20 px-1.5 text-[10px] font-bold text-accent">
                          YOU
                        </span>
                      )}
                      <span className="truncate">{e.displayName}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono font-semibold">
                        {formatActivityValue(
                          e.value,
                          board.activity.unit,
                          board.activity.slug
                        )}
                      </span>
                      {e.percentile != null && e.rank <= 3 && (
                        <PercentileTierBadge percentile={e.percentile} />
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-2 text-center text-[10px] uppercase tracking-wider text-muted">
              Top 10
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
