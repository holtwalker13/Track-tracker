import { ActivityChartPicker } from "@/components/charts/activity-chart-picker";
import { ProgressLine } from "@/components/charts/progress-line";
import { MarksWindowCard } from "@/components/performance/marks-window-card";
import { Card, CardTitle } from "@/components/ui/card";
import type { MarksWindow } from "@/lib/queries/marks-window";

export function AthleteProgressSection({
  marksWindow,
  catalog,
  activitySlug,
  progress,
}: {
  marksWindow: MarksWindow;
  catalog: { slug: string; name: string }[];
  activitySlug: string;
  progress: {
    activity: { name: string; unit: string };
    data: { label: string; value: number; benchmark?: number }[];
  } | null;
}) {
  const showDateRangeSlider =
    (progress?.data.length ?? 0) > 0 && marksWindow.dates.length > 1;

  return (
    <section className="mt-8 space-y-6">
      <h2 className="text-lg font-semibold">Progress over time</h2>
      <MarksWindowCard
        window={marksWindow}
        embedded
        showDateRangeSlider={showDateRangeSlider}
      />
      <div>
        <ActivityChartPicker activities={catalog} selected={activitySlug} />
        {progress && progress.data.length > 0 ? (
          <Card className="mt-3">
            <CardTitle>{progress.activity.name}</CardTitle>
            <div className="mt-4">
              <ProgressLine data={progress.data} unit={progress.activity.unit} />
            </div>
          </Card>
        ) : (
          <p className="mt-3 text-sm text-muted">No dated tests for this event yet.</p>
        )}
      </div>
    </section>
  );
}
