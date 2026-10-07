import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AthleteProfileClassPicker } from "@/components/athletes/athlete-profile-class-picker";
import { Card, CardTitle } from "@/components/ui/card";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  getCategoryRadar,
  getStudentScorecard,
  getProgressByTestDate,
} from "@/lib/queries/student";
import { getLatestResultsGrouped, getScholasticAttemptLog } from "@/lib/queries/attempt-log";
import {
  getStudentClassTags,
  getStudentPeerLeaders,
  getStudentSprintPotential,
} from "@/lib/queries/kpi";
import { getStudentMarksWindow } from "@/lib/queries/marks-window";
import { getStudentActivityRanks } from "@/lib/queries/coach";
import { RadarProfile } from "@/components/charts/radar-profile";
import { AthleteProgressSection } from "@/components/performance/athlete-progress-section";
import { AthleteResultsHistory } from "@/components/performance/athlete-results-history";
import { SprintPotentialCard } from "@/components/performance/sprint-potential";
import { MedalScopeControls } from "@/components/performance/medal-scope-controls";
import { PeerLeadersCard } from "@/components/performance/peer-leaders-card";
import {
  ClassYearRankingCard,
  LatestPersonalRecordsCard,
  PeriodLeadersCard,
  ScorecardGrid,
} from "@/components/performance/athlete-dashboard-cards";
import { GamificationSummaryCard } from "@/components/gamification/gamification-summary-card";
import {
  getGamificationSummary,
  getStudentDynamicAccolades,
  recomputeSchoolDynamicAccolades,
} from "@/lib/gamification/dynamic-accolades";
import { getAccoladeProgressForStudent } from "@/lib/gamification/engine";
import { ensureAccoladeDefinitions } from "@/lib/gamification/seed-accolades";
import { getRankedKpiSlugsForStudent } from "@/lib/services/kpi-sets";
import { ageBracketForClassYear, isAgeBracketId } from "@/lib/age-brackets";
import { classYearLabel, DEFAULT_CLASS_YEAR } from "@/lib/grades";
import { classSectionLabel, isGraduatingClassName } from "@/lib/periods";
import { AthleteProfileCard } from "@/components/athletes/athlete-profile-card";
import { genderFullLabel } from "@/lib/gender";
import { leaderboardHighlightFromSearch } from "@/lib/leaderboard-link";
import { StudentLoginLinkButton } from "@/components/athletes/student-login-link-button";
import { studentLoginStatusFromRow } from "@/lib/services/student-login-invite";
import { getStudentLeaderboard } from "@/lib/queries/leaderboard-student";

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
    subgroupId?: string;
    bracket?: string;
    window?: string;
  }>;
}) {
  const session = await requireSchoolSession();
  const { id } = await params;
  const sp = await searchParams;
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
  const window = sp.window === "week" ? "week" : "all";
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

  const schoolClasses = await prisma.class.findMany({
    where: { schoolId: session.schoolId },
    orderBy: [{ period: "asc" }, { name: "asc" }],
    select: { id: true, name: true, period: true },
  });

  const enrolledClassIds = enrolledClasses.map((c) => c.id);
  const latestSetRow = enrolledClassIds.length
    ? await prisma.kpiSet.findFirst({
        where: { schoolId: session.schoolId, classId: { in: enrolledClassIds } },
        orderBy: { updatedAt: "desc" },
        select: { classId: true },
      })
    : null;

  const pickerClasses = enrolledClasses.length > 0 ? enrolledClasses : schoolClasses;
  const profileClassId =
    sp.classId && pickerClasses.some((c) => c.id === sp.classId)
      ? sp.classId
      : (latestSetRow?.classId ?? enrolledClasses[0]?.id ?? null);

  const pickerClassIds = pickerClasses.map((c) => c.id);
  const subgroupRows = pickerClassIds.length
    ? await prisma.classSubgroup.findMany({
        where: { classId: { in: pickerClassIds } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, classId: true },
      })
    : [];
  const subgroupsByClassId: Record<string, { id: string; name: string }[]> = {};
  for (const sg of subgroupRows) {
    (subgroupsByClassId[sg.classId] ??= []).push({ id: sg.id, name: sg.name });
  }

  const urlSubgroupId = sp.subgroupId?.trim() || null;
  const hasSubgroupParam = sp.subgroupId !== undefined;
  const profileSubgroupId =
    hasSubgroupParam &&
    profileClassId &&
    urlSubgroupId &&
    (subgroupsByClassId[profileClassId] ?? []).some((s) => s.id === urlSubgroupId)
      ? urlSubgroupId
      : null;

  const membershipInMedalClass = profileClassId
    ? await prisma.classSubgroupMember.findFirst({
        where: { studentId: id, subgroup: { classId: profileClassId } },
        select: { subgroupId: true },
      })
    : null;
  const defaultSubgroupId = membershipInMedalClass?.subgroupId ?? null;

  const medalSubgroupScope = !profileClassId
    ? {}
    : hasSubgroupParam
      ? {
          classId: profileClassId,
          subgroupId:
            urlSubgroupId &&
            (subgroupsByClassId[profileClassId] ?? []).some((s) => s.id === urlSubgroupId)
              ? urlSubgroupId
              : null,
        }
      : { classId: profileClassId };

  const schoolYearEnd =
    enrollment?.schoolYear?.endDate?.getFullYear() ?? new Date().getFullYear();
  const defaultBracket = ageBracketForClassYear(grade, schoolYearEnd);
  const bracket =
    sp.bracket && isAgeBracketId(sp.bracket) ? sp.bracket : defaultBracket;

  await ensureAccoladeDefinitions();
  await recomputeSchoolDynamicAccolades(session.schoolId, "SEMESTER").catch(() => undefined);

  const gamification = await getGamificationSummary(id);
  const accoladeProgress = await getAccoladeProgressForStudent(id);
  const almostThere = accoladeProgress
    .filter(
      (a) =>
        !a.earned &&
        a.progressTarget != null &&
        a.progressCurrent != null &&
        a.progressTarget > a.progressCurrent &&
        a.progressCurrent / a.progressTarget >= 0.5
    )
    .slice(0, 3)
    .map((a) => ({
      slug: a.slug,
      name: a.name,
      category: a.category,
      progressCurrent: a.progressCurrent!,
      progressTarget: a.progressTarget!,
      progressLabel: a.progressLabel ?? "",
    }));

  const dynamicAccolades = await getStudentDynamicAccolades(id, session.schoolId);
  const classTags = await getStudentClassTags(id);
  const scorecard = await getStudentScorecard(id, grade);

  const rankedSlugs = await getRankedKpiSlugsForStudent(session.schoolId, id, {
    ...medalSubgroupScope,
    gender: student.gender,
    ageBracket: bracket,
  });

  const prs = await prisma.performanceResult.findMany({
    where: {
      studentId: id,
      isPersonalRecord: true,
      status: "COMPLETED",
      isBestAttempt: true,
    },
    include: { activity: true },
    orderBy: { testingDate: "desc" },
    take: 4,
  });

  const classYearRanks = await Promise.all(
    ["vertical-jump", "standing-broad-jump", "40-yard-dash"].map(async (slug) => {
      const lb = await getStudentLeaderboard(session.schoolId, slug, id, grade);
      const me = lb.entries.find((e) => e.studentId === id);
      return {
        activity: lb.activity.name,
        rank: me?.rank,
        total: lb.entries.length,
      };
    })
  );

  const [
    radar,
    latestGrouped,
    attemptLog,
    sprint,
    marksWindow,
    progress,
    activityRanks,
    peerLeaders,
  ] = await Promise.all([
    getCategoryRadar(id, grade),
    getLatestResultsGrouped(id, schoolYearId),
    getScholasticAttemptLog(id),
    getStudentSprintPotential(id, {
      ageBracket: bracket,
      window,
      ...medalSubgroupScope,
    }),
    getStudentMarksWindow(id, sp.from, sp.to),
    getProgressByTestDate(id, activitySlug),
    getStudentActivityRanks(session.schoolId, id, rankedSlugs, {
      gender: student.gender ?? undefined,
      scope: "school",
      classId: profileClassId ?? undefined,
    }),
    getStudentPeerLeaders(id, {
      ageBracket: bracket,
      window,
      classId: profileClassId,
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
          classes={pickerClasses}
          selectedClassId={profileClassId ?? null}
          subgroupsByClassId={subgroupsByClassId}
          selectedSubgroupId={profileSubgroupId}
          defaultSubgroupId={defaultSubgroupId}
        />
      </Suspense>

      <GamificationSummaryCard
        level={gamification.level}
        xpIntoLevel={gamification.xpIntoLevel}
        xpForNextLevel={gamification.xpForNextLevel}
        lifetimeXp={gamification.lifetimeXp}
        currentStreak={gamification.currentStreak}
        prCount={gamification.prCount}
        improvementPct={gamification.improvementPct}
        recentAccolades={gamification.recentAccolades}
        almostThere={almostThere}
      />

      <PeriodLeadersCard
        items={dynamicAccolades.filter(Boolean).map((d) => ({
          slug: d!.slug,
          name: d!.name,
          category: d!.category,
          periodType: d!.periodType,
        }))}
      />

      <div>
        <MedalScopeControls
          classes={classTags}
          defaultBracket={defaultBracket}
          defaultClassId={profileClassId}
          subgroupsByClassId={subgroupsByClassId}
          defaultSubgroupId={defaultSubgroupId}
          hideClassAndSubgroup
        />
        <SprintPotentialCard
          potential={sprint}
          ranks={ranks}
          highlightSlug={highlight?.slug}
        />
        <PeerLeadersCard
          leaders={peerLeaders}
          windowLabel={window === "week" ? "This week" : "All-time"}
        />
      </div>

      <Card className="mt-6">
        <CardTitle>Category strengths</CardTitle>
        <RadarProfile data={radar} />
      </Card>

      <ScorecardGrid scorecard={scorecard} />
      <LatestPersonalRecordsCard prs={prs} />
      <ClassYearRankingCard gradeLabel={classYearLabel(grade)} ranks={classYearRanks} />

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
