import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { STUDENT_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { getStudentContext } from "@/lib/queries/student";
import { classYearLabel } from "@/lib/grades";
import { getLatestResultsGrouped, getScholasticAttemptLog } from "@/lib/queries/attempt-log";
import { getStudentMarksWindow } from "@/lib/queries/marks-window";
import { LatestResultsGrouped } from "@/components/performance/latest-results-grouped";
import { AttemptSchedule } from "@/components/performance/attempt-schedule";
import { MarksWindowCard } from "@/components/performance/marks-window-card";

export default async function StudentPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; stat?: string }>;
}) {
  const session = await requireSession(["STUDENT"]);
  if (!session?.studentId) redirect("/login");
  const sp = await searchParams;

  const { student, currentGrade } = await getStudentContext(session.studentId);
  const enrollment = student.enrollments[0];

  const [latestGrouped, attemptLog, marksWindow] = await Promise.all([
    getLatestResultsGrouped(session.studentId, enrollment?.schoolYearId),
    getScholasticAttemptLog(session.studentId),
    getStudentMarksWindow(session.studentId, sp.from, sp.to),
  ]);

  return (
    <AppShell
      title="My Performance"
      subtitle={classYearLabel(currentGrade)}
      nav={STUDENT_NAV}
    >
      <section className="mt-2">
        <MarksWindowCard window={marksWindow} />
      </section>

      <section className="mt-10">
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
