import { requireSchoolSession } from "@/lib/auth/session";
import { CoachClassScopeBar } from "@/components/coach/coach-class-scope-bar";
import { getLeaderboardGrid } from "@/lib/queries/leaderboard-grid";
import { resolveCoachClassScopeFromParams } from "@/lib/queries/coach-scope-params";
import { LeaderboardToolbar } from "@/components/ui/leaderboard-toolbar";
import { LeaderboardGrid } from "@/components/leaderboards/leaderboard-grid";
import { gradesFromSearch, gradesLabel } from "@/lib/grades";
import { parseGenderParam, genderFullLabel } from "@/lib/gender";
import { isGraduatingClassName, classSectionLabel } from "@/lib/periods";
import {
  parseLeaderboardPeriod,
  periodLabel,
} from "@/lib/leaderboard-periods";

export default async function CompeteLeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{
    grade?: string;
    grades?: string;
    gender?: string;
    scope?: string;
    classId?: string;
    subgroupId?: string;
    coachId?: string;
    period?: string;
  }>;
}) {
  const session = await requireSchoolSession();
  const sp = await searchParams;
  const allClasses = sp.classId === "all";
  const scopeCtx = await resolveCoachClassScopeFromParams(
    session,
    {
      coachId: sp.coachId,
      classId: allClasses ? undefined : sp.classId,
      subgroupId: sp.subgroupId,
    },
    { defaultClassId: !allClasses }
  );
  const grades = gradesFromSearch(sp);
  const gender = parseGenderParam(sp.gender);
  const scope = sp.scope === "global" ? "global" : "school";
  const classId = allClasses ? undefined : scopeCtx.classId || undefined;
  const period = parseLeaderboardPeriod(sp.period);

  const classes = scopeCtx.classes.filter((c) => !isGraduatingClassName(c.name));

  let classLabel: string | null = null;
  if (classId) {
    const cls = classes.find((c) => c.id === classId);
    classLabel = cls ? classSectionLabel(cls) : null;
  }

  const { boards } = await getLeaderboardGrid(
    session.schoolId,
    grades,
    gender,
    scope,
    {
      role: session.role,
      schoolId: session.schoolId,
      studentId: session.studentId,
    },
    classId,
    period,
    undefined,
    allClasses ? null : scopeCtx.subgroupId
  );

  return (
    <>
      <div className="mb-4">
        <CoachClassScopeBar
          coaches={scopeCtx.coaches}
          classes={scopeCtx.classes}
          subgroups={scopeCtx.subgroups}
          coachId={scopeCtx.coachId}
          classId={allClasses ? "all" : scopeCtx.classId}
          subgroupId={scopeCtx.subgroupId ?? ""}
          showCoach={session.role === "ADMIN"}
          showSubgroup
          allClassesLabel="All classes"
        />
      </div>
      <LeaderboardToolbar classes={classes} schoolWideClassId="all" />
      <LeaderboardGrid
        boards={boards}
        subtitle={`${periodLabel(period)} · ${scope === "global" ? "Global" : "School"} · ${classLabel ?? gradesLabel(grades)} · ${genderFullLabel(gender).toLowerCase()}`}
        athleteHrefBase="/coach/students"
        rankScope={scope}
        compareHref="/coach/compete/compare"
      />
    </>
  );
}
