import { AppShell } from "@/components/layout/app-shell";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { getLeaderboardGrid } from "@/lib/queries/leaderboard-grid";
import { LeaderboardToolbar } from "@/components/ui/leaderboard-toolbar";
import { LeaderboardGrid } from "@/components/leaderboards/leaderboard-grid";
import { gradesFromSearch, gradesLabel } from "@/lib/grades";
import { parseGenderParam, genderFullLabel } from "@/lib/gender";
import { prisma } from "@/lib/db";
import { isGraduatingClassName, classSectionLabel } from "@/lib/periods";
import {
  parseLeaderboardPeriod,
  periodLabel,
} from "@/lib/leaderboard-periods";

export default async function CoachLeaderboardsPage({
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
  const grades = gradesFromSearch(sp);
  const gender = parseGenderParam(sp.gender);
  const scope = sp.scope === "global" ? "global" : "school";
  const classId = sp.classId?.trim() || undefined;
  const period = parseLeaderboardPeriod(sp.period);

  const classes = (
    await prisma.class.findMany({
      where: { schoolId: session.schoolId },
      select: { id: true, name: true, period: true },
      orderBy: [{ period: "asc" }, { name: "asc" }],
    })
  ).filter((c) => !isGraduatingClassName(c.name));

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
    period
  );

  return (
    <AppShell title="Leaderboards" nav={COACH_NAV}>
      <LeaderboardToolbar classes={classes} />
      <LeaderboardGrid
        boards={boards}
        subtitle={`${periodLabel(period)} · ${scope === "global" ? "Global" : "School"} · ${classLabel ?? gradesLabel(grades)} · ${genderFullLabel(gender).toLowerCase()}`}
        athleteHrefBase="/coach/students"
        rankScope={scope}
        compareHref="/coach/compare"
      />
    </AppShell>
  );
}
