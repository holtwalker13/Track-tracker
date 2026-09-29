import type { SchoolYearAttemptLog } from "@/lib/queries/attempt-log";
import type { LatestResultItem } from "@/lib/queries/attempt-log";
import type { ActivityDisplayGroup } from "@/lib/activity-groups";
import { AttemptSchedule } from "@/components/performance/attempt-schedule";
import { LatestResultsGrouped } from "@/components/performance/latest-results-grouped";

export function AthleteResultsHistory({
  grouped,
  attemptLog,
}: {
  grouped: Record<ActivityDisplayGroup, LatestResultItem[]>;
  attemptLog: SchoolYearAttemptLog[];
}) {
  return (
    <section className="mt-8 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Testing results & attempts</h2>
        <p className="mt-1 text-sm text-muted">
          Latest mark per event this year, with the full attempt log below.
        </p>
      </div>
      <LatestResultsGrouped grouped={grouped} compact />
      <AttemptSchedule years={attemptLog} />
    </section>
  );
}
