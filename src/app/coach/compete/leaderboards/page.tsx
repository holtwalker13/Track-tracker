import { requireSchoolSession } from "@/lib/auth/session";
import { getLeaderboardGrid } from "@/lib/queries/leaderboard-grid";
import { resolveCoachClassScopeFromParams } from "@/lib/queries/coach-scope-params";
import { gradesFromSearch } from "@/lib/grades";
import { parseGenderParam } from "@/lib/gender";
import { isGraduatingClassName } from "@/lib/periods";
import { parseLeaderboardPeriod } from "@/lib/leaderboard-periods";
import { CompeteLeaderboard } from "@/components/compete/compete-leaderboard";
import { prisma } from "@/lib/db";

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
    event?: string;
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

  const needsClassChoice =
    !allClasses && !scopeCtx.classId && session.role === "ADMIN";

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

  let schools: { id: string; name: string }[] = [];
  if (session.role === "ADMIN") {
    schools = await prisma.school.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });
  }
  const school = await prisma.school.findUnique({
    where: { id: session.schoolId },
    select: { name: true },
  });

  return (
    <CompeteLeaderboard
      boards={boards}
      schoolName={school?.name ?? null}
      coaches={scopeCtx.coaches}
      classes={classes}
      subgroups={scopeCtx.subgroups}
      showCoach={session.role === "ADMIN"}
      showSchoolSwitcher={session.role === "ADMIN" && schools.length > 1}
      schools={schools}
      currentSchoolId={session.schoolId}
      defaultCoachId={scopeCtx.coachId}
      defaultClassId={allClasses ? "all" : scopeCtx.classId}
      defaultSubgroupId={scopeCtx.subgroupId}
      allClassesLabel="All classes"
      athleteHrefBase="/coach/students"
      rankScope={scope}
      compareHref="/coach/compete/compare"
      needsClassChoice={needsClassChoice}
    />
  );
}
