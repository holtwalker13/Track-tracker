import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { STUDENT_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import {
  getStudentContext,
  getStudentScorecard,
  getCategoryRadar,
} from "@/lib/queries/student";
import { RadarProfile } from "@/components/charts/radar-profile";
import { prisma } from "@/lib/db";
import { getStudentLeaderboard } from "@/lib/queries/leaderboard-student";
import { genderFullLabel } from "@/lib/gender";
import { classYearLabel } from "@/lib/grades";
import {
  getStudentClassTags,
  getStudentPeerLeaders,
  getStudentSprintPotential,
} from "@/lib/queries/kpi";
import { SprintPotentialCard } from "@/components/performance/sprint-potential";
import { MedalScopeControls } from "@/components/performance/medal-scope-controls";
import { PeerLeadersCard } from "@/components/performance/peer-leaders-card";
import { ProfileBanner } from "@/components/layout/profile-banner";
import { getStudentActivityRanks } from "@/lib/queries/coach";
import { getRankedKpiSlugsForStudent } from "@/lib/services/kpi-sets";
import { leaderboardHighlightFromSearch } from "@/lib/leaderboard-link";
import { ageBracketForClassYear, isAgeBracketId } from "@/lib/age-brackets";
import { GamificationSummaryCard } from "@/components/gamification/gamification-summary-card";
import {
  ClassYearRankingCard,
  LatestPersonalRecordsCard,
  PeriodLeadersCard,
  ScorecardGrid,
} from "@/components/performance/athlete-dashboard-cards";
import { getAccoladeProgressForStudent } from "@/lib/gamification/engine";
import {
  getGamificationSummary,
  getStudentDynamicAccolades,
  recomputeSchoolDynamicAccolades,
} from "@/lib/gamification/dynamic-accolades";
import { ensureAccoladeDefinitions } from "@/lib/gamification/seed-accolades";

export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    lb?: string;
    rank?: string;
    scope?: string;
    classId?: string;
    subgroupId?: string;
    bracket?: string;
    window?: string;
  }>;
}) {
  const session = await requireSession(["STUDENT"]);
  if (!session?.studentId) redirect("/login");
  const studentId = session.studentId;
  const sp = await searchParams;
  const highlight = leaderboardHighlightFromSearch(sp);
  const window = sp.window === "week" ? "week" : "all";
  const urlClassId = sp.classId?.trim() || null;

  const { student, currentGrade } = await getStudentContext(studentId);
  const schoolYear = await prisma.schoolYear.findFirst({
    where: { schoolId: student.schoolId, isCurrent: true },
    select: { endDate: true },
  });
  const schoolYearEnd = schoolYear?.endDate?.getFullYear() ?? new Date().getFullYear();
  const defaultBracket = ageBracketForClassYear(currentGrade, schoolYearEnd);
  const bracket =
    sp.bracket && isAgeBracketId(sp.bracket) ? sp.bracket : defaultBracket;

  const schoolId = student.schoolId;

  await ensureAccoladeDefinitions();
  await recomputeSchoolDynamicAccolades(schoolId, "SEMESTER").catch(() => undefined);

  const gamification = await getGamificationSummary(studentId);
  const accoladeProgress = await getAccoladeProgressForStudent(studentId);
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

  const dynamicAccolades = await getStudentDynamicAccolades(studentId, schoolId);

  const scorecard = await getStudentScorecard(studentId, currentGrade);
  const radar = await getCategoryRadar(studentId, currentGrade);
  const classTags = await getStudentClassTags(studentId);
  const enrolledClassIds = classTags.map((c) => c.id);
  const latestMedalClassRow =
    enrolledClassIds.length > 0
      ? await prisma.kpiSet.findFirst({
          where: { schoolId, classId: { in: enrolledClassIds } },
          orderBy: { updatedAt: "desc" },
          select: { classId: true },
        })
      : null;
  const hasClassIdParam = sp.classId !== undefined;
  const medalClassId =
    urlClassId && enrolledClassIds.includes(urlClassId)
      ? urlClassId
      : hasClassIdParam
        ? null
        : (latestMedalClassRow?.classId ?? enrolledClassIds[0] ?? null);

  const subgroupRows =
    enrolledClassIds.length > 0
      ? await prisma.classSubgroup.findMany({
          where: { classId: { in: enrolledClassIds } },
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
  const membershipInMedalClass = medalClassId
    ? await prisma.classSubgroupMember.findFirst({
        where: { studentId, subgroup: { classId: medalClassId } },
        select: { subgroupId: true },
      })
    : null;
  const defaultSubgroupId = membershipInMedalClass?.subgroupId ?? null;
  const medalSubgroupScope = !medalClassId
    ? {}
    : hasSubgroupParam
      ? {
          classId: medalClassId,
          subgroupId:
            urlSubgroupId &&
            (subgroupsByClassId[medalClassId] ?? []).some((s) => s.id === urlSubgroupId)
              ? urlSubgroupId
              : null,
        }
      : { classId: medalClassId };

  const prs = await prisma.performanceResult.findMany({
    where: {
      studentId,
      isPersonalRecord: true,
      status: "COMPLETED",
      isBestAttempt: true,
    },
    include: { activity: true },
    orderBy: { testingDate: "desc" },
    take: 4,
  });

  const ranks = await Promise.all(
    ["vertical-jump", "standing-broad-jump", "40-yard-dash"].map(async (slug) => {
      const lb = await getStudentLeaderboard(
        schoolId,
        slug,
        studentId,
        currentGrade
      );
      const me = lb.entries.find((e) => e.displayName === "You");
      return {
        activity: lb.activity.name,
        rank: me?.rank,
        total: lb.entries.length,
      };
    })
  );

  const sprint = await getStudentSprintPotential(studentId, {
    ageBracket: bracket,
    window,
    ...medalSubgroupScope,
  });
  const peerLeaders = await getStudentPeerLeaders(studentId, {
    ageBracket: bracket,
    window,
    classId: medalClassId,
  });
  // Same ranked KPI list as the medal standard card (class scope when a medal class is selected).
  const rankedSlugs = await getRankedKpiSlugsForStudent(schoolId, studentId, {
    ...medalSubgroupScope,
    gender: student.gender,
    ageBracket: bracket,
  });
  const kpiRanks = await getStudentActivityRanks(
    schoolId,
    studentId,
    rankedSlugs,
    {
      gender: student.gender ?? undefined,
      scope: "school",
      classId: medalClassId ?? undefined,
    }
  );

  return (
    <AppShell title="Dashboard" nav={STUDENT_NAV}>
      <ProfileBanner
        name={`${student.firstName} ${student.lastName}`}
        meta={`${classYearLabel(currentGrade)} · ${genderFullLabel(student.gender)}`}
        seed={student.id}
      />

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
          defaultClassId={medalClassId}
          subgroupsByClassId={subgroupsByClassId}
          defaultSubgroupId={defaultSubgroupId}
        />
        <SprintPotentialCard
          potential={sprint}
          ranks={kpiRanks}
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
      <ClassYearRankingCard gradeLabel={classYearLabel(currentGrade)} ranks={ranks} />
    </AppShell>
  );
}
