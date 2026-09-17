import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getCategoryRadar } from "@/lib/queries/student";
import { getLatestResultsGrouped, getScholasticAttemptLog } from "@/lib/queries/attempt-log";
import { getStudentSprintPotential } from "@/lib/queries/kpi";
import { RadarProfile } from "@/components/charts/radar-profile";
import { LatestResultsGrouped } from "@/components/performance/latest-results-grouped";
import { AttemptSchedule } from "@/components/performance/attempt-schedule";
import { SprintPotentialCard } from "@/components/performance/sprint-potential";
import { classYearLabel, DEFAULT_CLASS_YEAR } from "@/lib/grades";

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) redirect("/login");
  const { id } = await params;

  const student = await prisma.studentProfile.findUnique({
    where: { id },
    include: {
      enrollments: {
        where: { schoolYear: { isCurrent: true } },
        include: { schoolYear: true },
      },
    },
  });
  if (!student || student.schoolId !== session.schoolId) notFound();

  const enrollment = student.enrollments[0];
  const grade = enrollment?.gradeLevel ?? DEFAULT_CLASS_YEAR;
  const schoolYearId = enrollment?.schoolYearId;

  const [radar, latestGrouped, attemptLog, sprint] = await Promise.all([
    getCategoryRadar(id, grade),
    getLatestResultsGrouped(id, schoolYearId),
    getScholasticAttemptLog(id),
    getStudentSprintPotential(id),
  ]);

  return (
    <AppShell title={`${student.firstName} ${student.lastName}`} nav={COACH_NAV}>
      <p className="text-muted">
        {classYearLabel(grade)} · {student.studentNumber}
        {student.sports ? ` · ${student.sports}` : ""}
        {enrollment?.schoolYear && ` · ${enrollment.schoolYear.label}`}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SprintPotentialCard potential={sprint} />
        <Card>
          <CardTitle>Athletic profile</CardTitle>
          <RadarProfile data={radar} />
        </Card>
      </div>

      <div className="mt-8">
        <p className="mb-3 text-sm text-muted">
          Latest result per event this school year (one row each). Change vs your previous attempt.
        </p>
        <LatestResultsGrouped grouped={latestGrouped} />
      </div>

      <div className="mt-8">
        <h2 className="mb-2 text-lg font-semibold">Scholastic attempt log</h2>
        <p className="mb-4 text-sm text-muted">
          Every testing day is listed like a schedule. Re-tests and new attempts add rows for that
          school year.
        </p>
        <AttemptSchedule years={attemptLog} />
      </div>
    </AppShell>
  );
}
