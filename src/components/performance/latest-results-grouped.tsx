import {
  DISPLAY_GROUP_LABELS,
  DISPLAY_GROUP_ORDER,
  type ActivityDisplayGroup,
} from "@/lib/activity-groups";
import type { LatestResultItem } from "@/lib/queries/attempt-log";
import { Card, CardTitle } from "@/components/ui/card";
import { LatestResultCard } from "@/components/performance/latest-result-card";

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
                <LatestResultCard key={item.activityId} item={item} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
