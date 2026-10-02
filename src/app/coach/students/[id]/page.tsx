import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AthleteProfileClassPicker } from "@/components/athletes/athlete-profile-class-picker";
import { resolveCoachClassContext } from "@/lib/coach-class-context";
import { Card, CardTitle } from "@/components/ui/card";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getCategoryRadar } from "@/lib/queries/student";
import { getLatestResultsGrouped, getScholasticAttemptLog } from "@/lib/queries/attempt-log";
import { getStudentSprintPotential } from "@/lib/queries/kpi";
import { getStudentMarksWindow } from "@/lib/queries/marks-window";
import { getProgressByTestDate } from "@/lib/queries/student";
import { getStudentActivityRanks } from "@/lib/queries/coach";
import { RadarProfile } from "@/components/charts/radar-profile";
import { AthleteProgressSection } from "@/components/performance/athlete-progress-section";
import { AthleteResultsHistory } from "@/components/performance/athlete-results-history";
import { SprintPotentialCard } from "@/components/performance/sprint-potential";
import { getRankedKpiSlugsForSchool } from "@/lib/services/kpi-sets";
import { classYearLabel, DEFAULT_CLASS_YEAR } from "@/lib/grades";
import { classSectionLabel, isGraduatingClassName } from "@/lib/periods";
import { AthleteProfileCard } from "@/components/athletes/athlete-profile-card";
import { genderFullLabel } from "@/lib/gender";
import { leaderboardHighlightFromSearch } from "@/lib/leaderboard-link";
import { StudentLoginLinkButton } from "@/components/athletes/student-login-link-button";
import { studentLoginStatusFromRow } from "@/lib/services/student-login-invite";

export default async function StudentProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    from?: string;
    to?: string;
    activity?: string;
    lb?: string;
    rank?: string;
    scope?: string;
    classId?: string;
  }>;
}) {
  const session = await requireSchoolSession();
  const { id } = await params;
  const sp = await searchParams;
  const coachCtx = await resolveCoachClassContext(session, { classId: sp.classId });

  const student = await prisma.studentProfile.findUnique({
    where: { id },
    include: {
      user: { select: { passwordSetAt: true } },
      loginInvite: { select: { usedAt: true, expiresAt: true } },
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

  const highlight = leaderboardHighlightFromSearch(sp);
  const catalog = await prisma.activity.findMany({
    where: { slug: { notIn: ["height", "weight"] } },
    orderBy: { name: "asc" },
    select: { slug: true, name: true },
  });
  const activitySlug = catalog.some((a) => a.slug === sp.activity)
    ? sp.activity!
    : highlight?.slug && catalog.some((a) => a.slug === highlight.slug)
      ? highlight.slug
      : "vertical-jump";

  const enrolledClasses = student.classEnrollments
    .filter((e) => !isGraduatingClassName(e.class.name))
    .map((e) => e.class);

  const profileClassId =
    sp.classId && enrolledClasses.some((c) => c.id === sp.classId)
      ? sp.classId
      : coachCtx.classId && enrolledClasses.some((c) => c.id === coachCtx.classId)
        ? coachCtx.classId
        : enrolledClasses[0]?.id ?? coachCtx.classId;

  const rankedSlugs = await getRankedKpiSlugsForSchool(
    session.schoolId,
    profileClassId,
    coachCtx.subgroupId
  );

  const [radar, latestGrouped, attemptLog, sprint, marksWindow, progress, activityRanks] =
    await Promise.all([
      getCategoryRadar(id, grade),
      getLatestResultsGrouped(id, schoolYearId),
      getScholasticAttemptLog(id),
      getStudentSprintPotential(id, { classId: profileClassId, subgroupId: coachCtx.subgroupId }),
      getStudentMarksWindow(id, sp.from, sp.to),
      getProgressByTestDate(id, activitySlug),
      getStudentActivityRanks(student.schoolId, id, rankedSlugs, {
        gender: student.gender ?? undefined,
        scope: "school",
      }),
    ]);
  const ranks = { ...activityRanks };

  const fullName = `${student.firstName} ${student.lastName}`;
  const loginStatus = studentLoginStatusFromRow({
    userId: student.userId,
    user: student.user,
    loginInvite: student.loginInvite,
  });
  const sections = enrolledClasses.map((c) => ({
    id: c.id,
    label: classSectionLabel(c),
  }));

  const schoolClasses = await prisma.class.findMany({
    where: { schoolId: session.schoolId },
    orderBy: [{ period: "asc" }, { name: "asc" }],
    select: { id: true, name: true, period: true },
  });

  return (
    <AppShell title="Athlete" nav={COACH_NAV}>
      <AthleteProfileCard
        name={fullName}
        studentNumber={student.studentNumber}
        gender={student.gender ? genderFullLabel(student.gender) : null}
        schoolYear={enrollment?.schoolYear?.label ?? null}
        sections={sections}
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

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-card-border bg-card/40 px-4 py-3">
        <p className="text-sm text-muted">
          Login ID <span className="font-mono text-foreground">{student.studentNumber}</span> is unique
          within this school; athletes sign in with that ID after opening their invite link.
        </p>
        <StudentLoginLinkButton
          studentId={student.id}
          fullName={fullName}
          loginStatus={loginStatus}
        />
      </div>

      <Suspense fallback={null}>
        <AthleteProfileClassPicker
          classes={enrolledClasses.length > 0 ? enrolledClasses : schoolClasses}
          selectedClassId={profileClassId ?? null}
        />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <SprintPotentialCard
          potential={sprint}
          ranks={ranks}
          highlightSlug={highlight?.slug}
        />
        <Card>
          <CardTitle>Athletic profile</CardTitle>
          <RadarProfile data={radar} />
        </Card>
      </div>

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
