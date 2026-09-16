import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { STUDENT_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { getStudentContext } from "@/lib/queries/student";
import { getLatestResultsGrouped, getScholasticAttemptLog } from "@/lib/queries/attempt-log";
import { LatestResultsGrouped } from "@/components/performance/latest-results-grouped";
import { AttemptSchedule } from "@/components/performance/attempt-schedule";

export default async function StudentPerformancePage() {
  const session = await requireSession(["STUDENT"]);
  if (!session?.studentId) redirect("/login");

  const { student, currentGrade } = await getStudentContext(session.studentId);
  const enrollment = student.enrollments[0];

  const [latestGrouped, attemptLog] = await Promise.all([
    getLatestResultsGrouped(session.studentId, enrollment?.schoolYearId),
    getScholasticAttemptLog(session.studentId),
  ]);

  return (
    <AppShell title="My Performance" nav={STUDENT_NAV}>
      <p className="text-muted">Grade {currentGrade}</p>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Latest results</h2>
        <p className="mt-1 text-sm text-muted">
          One entry per event this year — running, jumping, and everything else — with improvement
          since your last attempt.
        </p>
        <div className="mt-4">
          <LatestResultsGrouped grouped={latestGrouped} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Attempt log by school year</h2>
        <p className="mt-1 text-sm text-muted">
          Full history for each scholastic year. Each time you test, it appears here with all tries
          and your best mark.
        </p>
        <div className="mt-4">
          <AttemptSchedule years={attemptLog} />
        </div>
      </section>
    </AppShell>
  );
}
