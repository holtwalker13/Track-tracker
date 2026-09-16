import {
  DISPLAY_GROUP_LABELS,
  DISPLAY_GROUP_ORDER,
  type ActivityDisplayGroup,
} from "@/lib/activity-groups";
import type { LatestResultItem } from "@/lib/queries/attempt-log";
import { Card, CardTitle } from "@/components/ui/card";

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
          <Card key={groupKey}>
            <CardTitle>{DISPLAY_GROUP_LABELS[groupKey]}</CardTitle>
            <ul className="mt-4 divide-y divide-card-border/50">
              {items.map((item) => (
                <li
                  key={item.activityId}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{item.activityName}</p>
                    <p className="text-xs text-muted">
                      {item.testingDate.toLocaleDateString()}
                      {item.isPr && (
                        <span className="ml-2 text-success">Personal record</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold tabular-nums">{item.display}</p>
                    <div className="mt-1 flex flex-wrap justify-end gap-x-3 text-xs">
                      {item.percentile != null && (
                        <span className="text-accent">{item.percentile}th %ile</span>
                      )}
                      {item.deltaDisplay && (
                        <span
                          className={
                            item.deltaFromPrevious != null && item.deltaFromPrevious > 0
                              ? "text-success"
                              : "text-muted"
                          }
                        >
                          {item.deltaDisplay}
                        </span>
                      )}
                      {!item.deltaDisplay && (
                        <span className="text-muted">First attempt this year</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
