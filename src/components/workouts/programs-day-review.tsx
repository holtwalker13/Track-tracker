import { TestDayReview } from "@/components/workouts/test-day-review";
import { WorkoutDayReview } from "@/components/workouts/workout-day-review";
import type { TestingDayReview } from "@/lib/queries/testing-log";
import type { WorkoutDayReview as WorkoutDayReviewData } from "@/lib/queries/workout-day-review";

export function ProgramsDayReview({
  workout,
  test,
}: {
  workout: WorkoutDayReviewData | null;
  test: TestingDayReview | null;
}) {
  if (test) return <TestDayReview review={test} />;
  if (workout && workout.assignments.length > 0) {
    return <WorkoutDayReview review={workout} focusAssignmentId={workout.assignments[0]?.assignmentId} />;
  }
  return (
    <section id="day-review" className="rounded-2xl border border-dashed border-card-border px-4 py-8 text-center">
      <h2 className="text-base font-semibold">Day review</h2>
      <p className="mt-1 text-sm text-muted">Click a workout or a test on the calendar.</p>
    </section>
  );
}
