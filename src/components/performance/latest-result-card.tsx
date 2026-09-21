import { ActivityIcon } from "@/lib/activity-icons";
import { PercentileTicker } from "@/components/performance/percentile-ticker";
import { PercentileTrendMini } from "@/components/charts/percentile-trend-mini";
import type { LatestResultItem } from "@/lib/queries/attempt-log";

export function LatestResultCard({ item }: { item: LatestResultItem }) {
  return (
    <li className="overflow-hidden rounded-xl border border-card-border bg-card">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <ActivityIcon slug={item.activitySlug} className="mt-0.5 h-6 w-6 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{item.activityName}</p>
            <p className="mt-0.5 text-xs text-muted">
              {item.testingDate.toLocaleDateString()}
              {item.isPr && <span className="ml-2 font-medium text-sport-gold">PR</span>}
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-accent">{item.display}</p>
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
  );
}
