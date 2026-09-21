import {
  DISPLAY_GROUP_LABELS,
  DISPLAY_GROUP_ORDER,
  type ActivityDisplayGroup,
} from "@/lib/activity-groups";
import type { LatestResultItem } from "@/lib/queries/attempt-log";
import { Card, CardTitle } from "@/components/ui/card";
import { ActivityIcon } from "@/lib/activity-icons";
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
    <div className="space-y-8">
      {DISPLAY_GROUP_ORDER.map((groupKey) => {
        const items = grouped[groupKey];
        if (items.length === 0) return null;
        return (
          <section key={groupKey}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
              {DISPLAY_GROUP_LABELS[groupKey]}
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <li
                  key={item.activityId}
                  className="overflow-hidden rounded-xl border border-card-border bg-card"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <ActivityIcon slug={item.activitySlug} className="mt-0.5 h-6 w-6 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{item.activityName}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {item.testingDate.toLocaleDateString()}
                          {item.isPr && (
                            <span className="ml-2 font-medium text-sport-gold">PR</span>
                          )}
                        </p>
                        <p className="mt-2 text-2xl font-bold tabular-nums text-accent">
                          {item.display}
                        </p>
                        {item.deltaDisplay && (
                          <p
                            className={`mt-0.5 text-xs font-medium ${
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
                        {item.percentile != null && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <PercentileTicker
                              percentile={item.percentile}
                              previousPercentile={item.previousPercentile}
                            />
                          </div>
                        )}
                        <PercentileTrendMini data={item.percentileTrend} />
                      </div>
                    </div>
                  </div>

                  {item.history.length > 0 && (
                    <ul className="border-t border-card-border/70 bg-background/40">
                      {item.history.map((h, idx) => (
                        <li
                          key={`${item.activityId}-${h.testingDate.toISOString()}-${idx}`}
                          className="flex items-center justify-between gap-3 border-t border-card-border/40 px-4 py-2 text-xs text-muted/80 first:border-t-0"
                        >
                          <span className="tabular-nums">{h.display}</span>
                          <span className="shrink-0">
                            {h.testingDate.toLocaleDateString(undefined, {
                              month: "numeric",
                              day: "numeric",
                              year: "2-digit",
                            })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
