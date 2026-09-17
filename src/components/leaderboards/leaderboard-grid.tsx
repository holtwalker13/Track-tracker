import { Card, CardTitle } from "@/components/ui/card";
import { ActivityIcon } from "@/lib/activity-icons";
import { formatActivityValue } from "@/lib/format";
import { PlayerRow } from "@/components/athletes/player-row";
import type { LeaderboardBoard } from "@/lib/queries/leaderboard-grid";

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
          <Card key={board.activity.id}>
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
              <ol className="mt-3 space-y-0.5">
                {board.entries.map((e) => (
                  <li key={e.rank}>
                    <PlayerRow
                      rank={e.rank}
                      name={e.displayName}
                      value={formatActivityValue(
                        e.value,
                        board.activity.unit,
                        board.activity.slug
                      )}
                      percentile={e.percentile}
                      highlight={e.displayName === "You"}
                    />
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
