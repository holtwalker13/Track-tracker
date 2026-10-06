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
import { AccoladeIcon } from "@/components/gamification/accolade-icon";
import type { AccoladeCategory } from "@/lib/gamification/accolade-definitions";
import { themeForAccoladeCategory } from "@/lib/gamification/accolade-theme";
import { cn } from "@/lib/utils";
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
  const classId = sp.classId?.trim() || null;

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
    classId,
  });
  const peerLeaders = await getStudentPeerLeaders(studentId, {
    ageBracket: bracket,
    window,
    classId,
  });
  // Rank chips come from the same KPI set resolution as the medal card above.
  const rankedSlugs = await getRankedKpiSlugsForStudent(schoolId, studentId, { classId });
  const kpiRanks = await getStudentActivityRanks(
    schoolId,
    studentId,
    rankedSlugs,
    {
      gender: student.gender ?? undefined,
      scope: "school",
      classId: classId ?? undefined,
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

      {dynamicAccolades.length > 0 && (
        <Card className="mt-6 border-sport-gold/30 bg-sport-gold/5">
          <CardTitle className="text-sport-gold">Period leaders</CardTitle>
          <ul className="mt-4 space-y-3 text-sm">
            {dynamicAccolades.map((d) => {
              if (!d) return null;
              const cat = d.category as AccoladeCategory;
              const theme = themeForAccoladeCategory(cat);
              return (
                <li key={d.slug} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <AccoladeIcon slug={d.slug} category={cat} earned size="sm" />
                    <span className={cn("font-semibold", theme.sectionAccent)}>{d.name}</span>
                  </span>
                  <span className="text-muted">{d.periodType.toLowerCase()}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <div>
        <MedalScopeControls classes={classTags} defaultBracket={defaultBracket} />
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

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {scorecard.map((c) => (
          <Card key={c.activity.id}>
            <CardTitle>{c.activity.name}</CardTitle>
            <p className="mt-2 text-4xl font-bold">{c.display}</p>
            {c.percentile != null && (
              <p className="text-accent">{c.percentile}th percentile</p>
            )}
            {c.yoy && <p className="text-sm text-muted">{c.yoy}</p>}
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardTitle>Latest personal records</CardTitle>
        <ul className="mt-4 space-y-2">
          {prs.map((p) => (
            <li key={p.id} className="flex justify-between">
              <span>{p.activity.name}</span>
              <span className="font-bold text-success">{p.displayValue}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-6">
        <CardTitle>{classYearLabel(currentGrade)} ranking</CardTitle>
        <ul className="mt-4 space-y-2">
          {ranks.map((r) => (
            <li key={r.activity} className="flex justify-between text-sm">
              <span>{r.activity}</span>
              <span>
                {r.rank != null ? `#${r.rank} of ${r.total}` : "—"}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </AppShell>
  );
}
