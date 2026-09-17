import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getCategoryRadar } from "@/lib/queries/student";
import { getLatestResultsGrouped, getScholasticAttemptLog } from "@/lib/queries/attempt-log";
import { getStudentSprintPotential } from "@/lib/queries/kpi";
import { getStudentMarksWindow } from "@/lib/queries/marks-window";
import { getProgressByTestDate } from "@/lib/queries/student";
import { RadarProfile } from "@/components/charts/radar-profile";
import { LatestResultsGrouped } from "@/components/performance/latest-results-grouped";
import { AttemptSchedule } from "@/components/performance/attempt-schedule";
import { SprintPotentialCard } from "@/components/performance/sprint-potential";
import { MarksWindowCard } from "@/components/performance/marks-window-card";
import { ProgressLine } from "@/components/charts/progress-line";
import { ActivityChartPicker } from "@/components/charts/activity-chart-picker";
import { classYearLabel, DEFAULT_CLASS_YEAR } from "@/lib/grades";
import { AthleteProfileCard } from "@/components/athletes/athlete-profile-card";
import { genderFullLabel } from "@/lib/gender";

export default async function StudentProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string; activity?: string }>;
}) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) redirect("/login");
  const { id } = await params;
  const sp = await searchParams;

  const student = await prisma.studentProfile.findUnique({
    where: { id },
    include: {
      enrollments: {
        where: { schoolYear: { isCurrent: true } },
        include: { schoolYear: true },
      },
      classEnrollments: { include: { class: true } },
    },
  });
  if (!student || student.schoolId !== session.schoolId) notFound();

  const enrollment = student.enrollments[0];
  const grade = enrollment?.gradeLevel ?? DEFAULT_CLASS_YEAR;
  const schoolYearId = enrollment?.schoolYearId;

  const catalog = await prisma.activity.findMany({
    where: { slug: { notIn: ["height", "weight"] } },
    orderBy: { name: "asc" },
    select: { slug: true, name: true },
  });
  const activitySlug = catalog.some((a) => a.slug === sp.activity)
    ? sp.activity!
    : "vertical-jump";

  const [radar, latestGrouped, attemptLog, sprint, marksWindow, progress] = await Promise.all([
    getCategoryRadar(id, grade),
    getLatestResultsGrouped(id, schoolYearId),
    getScholasticAttemptLog(id),
    getStudentSprintPotential(id),
    getStudentMarksWindow(id, sp.from, sp.to),
    getProgressByTestDate(id, activitySlug),
  ]);

  const classNames = student.classEnrollments.map((e) => e.class.name).join(" · ");
  const fullName = `${student.firstName} ${student.lastName}`;
  const meta = [
    student.studentNumber,
    student.gender ? genderFullLabel(student.gender) : null,
    student.participationType === "ATHLETE"
      ? "Student athlete"
      : student.participationType === "PE"
        ? "PE student"
        : null,
    classNames || null,
    enrollment?.schoolYear?.label ?? null,
  ]
    .filter(Boolean)
    .join(" · ");

  const schoolClasses = await prisma.class.findMany({
    where: { schoolId: session.schoolId },
    orderBy: [{ period: "asc" }, { name: "asc" }],
    select: { id: true, name: true, period: true },
  });

  return (
    <AppShell title="Athlete" nav={COACH_NAV}>
      <AthleteProfileCard
        name={fullName}
        meta={meta}
        seed={student.id}
        sports={student.sports}
        classLabel={classYearLabel(grade)}
        edit={{
          studentId: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          sports: student.sports,
          participationType: student.participationType,
          classYear: grade,
          classes: schoolClasses,
          enrolledClassIds: student.classEnrollments.map((e) => e.classId),
        }}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SprintPotentialCard potential={sprint} />
        <Card>
          <CardTitle>Athletic profile</CardTitle>
          <RadarProfile data={radar} />
        </Card>
      </div>

      <div className="mt-8">
        <MarksWindowCard window={marksWindow} />
      </div>

      <div className="mt-8">
        <h2 className="mb-2 text-lg font-semibold">Progress by test date</h2>
        <ActivityChartPicker activities={catalog} selected={activitySlug} />
        {progress && progress.data.length > 0 ? (
          <Card>
            <CardTitle>{progress.activity.name}</CardTitle>
            <div className="mt-4">
              <ProgressLine data={progress.data} unit={progress.activity.unit} />
            </div>
          </Card>
        ) : (
          <p className="text-sm text-muted">No dated tests for this event yet.</p>
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-2 text-lg font-semibold">Latest results</h2>
        <p className="mb-3 text-sm text-muted">
          Speed, power, and strength in a card grid. Gap callouts vs prior marks stay in Average vs PR above.
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
