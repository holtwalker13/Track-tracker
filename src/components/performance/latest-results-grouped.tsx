import {
  DISPLAY_GROUP_LABELS,
  DISPLAY_GROUP_ORDER,
  type ActivityDisplayGroup,
} from "@/lib/activity-groups";
import type { LatestResultItem } from "@/lib/queries/attempt-log";
import { Card, CardTitle } from "@/components/ui/card";
import { ActivityIcon } from "@/lib/activity-icons";
import { groupAccent } from "@/lib/sport-theme";
import { PercentileTierBadge } from "@/components/performance/percentile-tier-badge";
import { PercentileTicker } from "@/components/performance/percentile-ticker";
import { PercentileTrendMini } from "@/components/charts/percentile-trend-mini";

export function LatestResultsGrouped({
  grouped,
}: {
  grouped: Record<ActivityDisplayGroup, LatestResultItem[]>;
}) {
  const hasAny = DISPLAY_GROUP_ORDER.some((g) => grouped[g].length > 0);

  if (!hasAny) {
    return (
      <Card>
        <CardTitle>Latest results</CardTitle>
        <p className="mt-3 text-sm text-muted">No results yet for this school year.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {DISPLAY_GROUP_ORDER.map((groupKey) => {
        const items = grouped[groupKey];
        if (items.length === 0) return null;
        return (
          <Card key={groupKey} className={`border-2 ${groupAccent(groupKey)}`}>
            <CardTitle>{DISPLAY_GROUP_LABELS[groupKey]}</CardTitle>
            <ul className="mt-4 space-y-4">
              {items.map((item) => (
                <li
                  key={item.activityId}
                  className="rounded-xl border border-card-border/50 bg-background/30 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <ActivityIcon slug={item.activitySlug} className="mt-1 h-7 w-7" />
                      <div>
                        <p className="font-semibold">{item.activityName}</p>
                        <p className="text-xs text-muted">
                          {item.testingDate.toLocaleDateString()}
                          {item.isPr && (
                            <span className="ml-2 font-medium text-sport-gold">PR</span>
                          )}
                        </p>
                        {item.percentile != null && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <PercentileTierBadge percentile={item.percentile} />
                            <PercentileTicker
                              percentile={item.percentile}
                              previousPercentile={item.previousPercentile}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold tabular-nums text-accent">{item.display}</p>
                      {item.deltaDisplay && (
                        <p
                          className={`mt-1 text-xs font-medium ${
                            item.deltaFromPrevious != null && item.deltaFromPrevious > 0
                              ? "text-sport-green"
                              : item.deltaFromPrevious != null && item.deltaFromPrevious < 0
                                ? "text-sport-red"
                                : "text-muted"
                          }`}
                        >
                          {item.deltaDisplay}
                        </p>
                      )}
                    </div>
                  </div>
                  <PercentileTrendMini data={item.percentileTrend} />
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
