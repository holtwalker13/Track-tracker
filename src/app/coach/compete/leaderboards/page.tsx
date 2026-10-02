import { requireSchoolSession } from "@/lib/auth/session";
import { resolveCoachClassContext } from "@/lib/coach-class-context";
import { getLeaderboardGrid } from "@/lib/queries/leaderboard-grid";
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
    period?: string;
  }>;
}) {
  const session = await requireSchoolSession();
  const sp = await searchParams;
  const coachCtx = await resolveCoachClassContext(session, {
    classId: sp.classId?.trim() || undefined,
  });
  const grades = gradesFromSearch(sp);
  const gender = parseGenderParam(sp.gender);
  const scope = sp.scope === "global" ? "global" : "school";
  const classId = sp.classId?.trim() || coachCtx.classId || undefined;
  const period = parseLeaderboardPeriod(sp.period);

  const classes = coachCtx.classes
    .map((c) => ({ id: c.id, name: c.name, period: c.period }))
    .filter((c) => !isGraduatingClassName(c.name));

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
    coachCtx.subgroupId
  );

  return (
    <>
      <LeaderboardToolbar classes={classes} />
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
