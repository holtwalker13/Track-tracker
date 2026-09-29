import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { STUDENT_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { getStudentContext } from "@/lib/queries/student";
import { classYearLabel } from "@/lib/grades";
import { getLatestResultsGrouped, getScholasticAttemptLog } from "@/lib/queries/attempt-log";
import { getStudentMarksWindow } from "@/lib/queries/marks-window";
import { getProgressByTestDate } from "@/lib/queries/student";
import { prisma } from "@/lib/db";
import { AthleteProgressSection } from "@/components/performance/athlete-progress-section";
import { AthleteResultsHistory } from "@/components/performance/athlete-results-history";

export default async function StudentPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; stat?: string; activity?: string }>;
}) {
  const session = await requireSession(["STUDENT"]);
  if (!session?.studentId) redirect("/login");
  const sp = await searchParams;

  const { student, currentGrade } = await getStudentContext(session.studentId);
  const enrollment = student.enrollments[0];

  const catalog = await prisma.activity.findMany({
    where: { slug: { notIn: ["height", "weight"] } },
    orderBy: { name: "asc" },
    select: { slug: true, name: true },
  });
  const activitySlug = catalog.some((a) => a.slug === sp.activity)
    ? sp.activity!
    : "vertical-jump";

  const [latestGrouped, attemptLog, marksWindow, progress] = await Promise.all([
    getLatestResultsGrouped(session.studentId, enrollment?.schoolYearId),
    getScholasticAttemptLog(session.studentId),
    getStudentMarksWindow(session.studentId, sp.from, sp.to),
    getProgressByTestDate(session.studentId, activitySlug),
  ]);

  return (
    <AppShell title="My Performance" nav={STUDENT_NAV}>
      <p className="mb-6 text-sm text-muted">{classYearLabel(currentGrade)}</p>
      <AthleteProgressSection
        marksWindow={marksWindow}
        catalog={catalog}
        activitySlug={activitySlug}
        progress={progress}
      />

      <AthleteResultsHistory grouped={latestGrouped} attemptLog={attemptLog} />
    </AppShell>
  );
}
