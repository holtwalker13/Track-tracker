import { PlayerAvatar } from "@/components/athletes/player-avatar";
import { ActivityIcon } from "@/lib/activity-icons";
import { DISPLAY_GROUP_LABELS, DISPLAY_GROUP_ORDER } from "@/lib/activity-groups";
import type { CompareEventRow } from "@/lib/queries/compare";
import { cn, boxScoreNameFromFull } from "@/lib/utils";

export type DuelSide = {
  name: string;
  meta: string;
  isBenchmark?: boolean;
};

function barWidth(
  self: number | null,
  other: number | null,
  higherBetter: boolean
): number {
  if (self == null) return 0;
  if (other == null) return 70;
  if (self === other) return 50;
  if (higherBetter) {
    const max = Math.max(self, other);
    return max === 0 ? 50 : Math.max(8, Math.min(100, (self / max) * 100));
  }
  const min = Math.min(self, other);
  if (self === 0) return 8;
  return Math.max(8, Math.min(100, (min / self) * 100));
}

function DuelRow({
  row,
  rightValue,
  rightDisplay,
}: {
  row: CompareEventRow;
  rightValue: number | null;
  rightDisplay: string;
}) {
  const higherBetter = row.direction === "HIGHER_BETTER";
  const leftW = barWidth(row.athleteValue, rightValue, higherBetter);
  const rightW = barWidth(rightValue, row.athleteValue, higherBetter);
  const leftWins =
    row.athleteValue != null &&
    rightValue != null &&
    (higherBetter ? row.athleteValue > rightValue : row.athleteValue < rightValue);
  const rightWins =
    row.athleteValue != null &&
    rightValue != null &&
    (higherBetter ? rightValue > row.athleteValue : rightValue < row.athleteValue);

  return (
    <div className="py-2.5">
      <div className="mb-1.5 flex items-center justify-center gap-1.5 px-8 text-center">
        <ActivityIcon
          slug={row.activitySlug}
          categorySlug={row.categorySlug}
          className="h-3.5 w-3.5 shrink-0"
        />
        <span className="text-[11px] leading-tight text-muted">{row.activityName}</span>
      </div>
      <div className="grid grid-cols-[minmax(2.75rem,auto)_1fr_minmax(2.75rem,auto)] items-center gap-2">
        <span
          className={cn(
            "text-right font-mono text-sm font-bold tabular-nums",
            leftWins && "text-sky-400"
          )}
        >
          {row.athleteDisplay}
        </span>
        <div className="flex min-w-0 items-center">
          <div className="flex h-2 min-w-0 flex-1 justify-end overflow-hidden rounded-l-full bg-card-border/60">
            <div
              className="h-full rounded-l-full bg-sky-500"
              style={{ width: `${leftW}%` }}
            />
          </div>
          <div className="flex h-2 min-w-0 flex-1 justify-start overflow-hidden rounded-r-full bg-card-border/60">
            <div
              className="h-full rounded-r-full bg-amber-400"
              style={{ width: `${rightW}%` }}
            />
          </div>
        </div>
        <span
          className={cn(
            "font-mono text-sm font-bold tabular-nums",
            rightWins && "text-amber-300"
          )}
        >
          {rightDisplay}
        </span>
      </div>
    </div>
  );
}

export function AthleteDuel({
  left,
  right,
  events,
  rightSource,
}: {
  left: DuelSide;
  right: DuelSide;
  events: CompareEventRow[];
  rightSource: "benchmark" | "peer" | "athlete";
}) {
  return (
    <div className="rounded-2xl border border-card-border bg-card px-4 py-5 sm:px-6">
      <p className="mb-4 text-center text-xs uppercase tracking-widest text-muted">
        {rightSource === "athlete"
          ? "Athlete comparison"
          : rightSource === "peer"
            ? "Vs class average"
            : "Vs medal target"}
        <span className="mt-1 block font-normal normal-case tracking-normal">Season stats</span>
      </p>
      <div className="mb-6 grid grid-cols-[1fr_1fr] items-start gap-4">
        <div className="flex items-center gap-3">
          <PlayerAvatar name={left.name} size="lg" />
          <div>
            <p className="font-bold">{boxScoreNameFromFull(left.name)}</p>
            <p className="text-xs text-muted">{left.meta}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 text-right">
          <div>
            <p className="font-bold">
              {right.isBenchmark ? right.name : boxScoreNameFromFull(right.name)}
            </p>
            <p className="text-xs text-muted">{right.meta}</p>
          </div>
          {right.isBenchmark ? (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/20 text-xs font-bold uppercase tracking-wide text-amber-300">
              P50
            </span>
          ) : (
            <PlayerAvatar name={right.name} size="lg" />
          )}
        </div>
      </div>

      {DISPLAY_GROUP_ORDER.map((group) => {
        const rows = events.filter((e) => e.group === group);
        if (rows.length === 0) return null;
        return (
          <div key={group} className="mb-6 last:mb-0">
            <p className="mb-1 text-sm font-semibold text-muted">
              {DISPLAY_GROUP_LABELS[group]}
            </p>
            {rows
              .map((row) => {
                const rightValue =
                  rightSource === "athlete"
                    ? row.opponentValue
                    : rightSource === "peer"
                      ? row.peerAvg
                      : row.benchmarkP50;
                const rightDisplay =
                  rightSource === "athlete"
                    ? row.opponentDisplay
                    : rightSource === "peer"
                      ? row.peerDisplay
                      : row.benchmarkDisplay;
                if (row.athleteValue == null && rightValue == null) return null;
                return (
                  <DuelRow
                    key={row.activityId}
                    row={row}
                    rightValue={rightValue}
                    rightDisplay={rightDisplay}
                  />
                );
              })}
          </div>
        );
      })}
    </div>
  );
}
