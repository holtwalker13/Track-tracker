import { AppShell } from "@/components/layout/app-shell";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { getLeaderboardGrid } from "@/lib/queries/leaderboard-grid";
import { LeaderboardGrid } from "@/components/leaderboards/leaderboard-grid";
import { GradePills } from "@/components/ui/filter-pills";
import { GenderToggle } from "@/components/ui/gender-toggle";
import { RankScopeToggle } from "@/components/ui/rank-scope-toggle";
import { ClassFilterPills } from "@/components/ui/class-filter-pills";
import { gradesFromSearch, gradesLabel } from "@/lib/grades";
import { parseGenderParam, genderFullLabel } from "@/lib/gender";
import { prisma } from "@/lib/db";
import { isGraduatingClassName, classSectionLabel } from "@/lib/periods";

export default async function CoachLeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{
    grade?: string;
    grades?: string;
    gender?: string;
    scope?: string;
    classId?: string;
  }>;
}) {
  const session = await requireSchoolSession();
  const sp = await searchParams;
  const grades = gradesFromSearch(sp);
  const gender = parseGenderParam(sp.gender);
  const scope = sp.scope === "global" ? "global" : "school";
  const classId = sp.classId?.trim() || undefined;

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
    classId
  );

  return (
    <AppShell title="Leaderboards" nav={COACH_NAV}>
      <div className="mb-6 space-y-4">
        <ClassFilterPills classes={classes} />
        <GradePills />
        <GenderToggle />
        <RankScopeToggle />
      </div>
      <LeaderboardGrid
        boards={boards}
        subtitle={`${scope === "global" ? "Global" : "School"} rank · ${classLabel ?? gradesLabel(grades)} · ${genderFullLabel(gender).toLowerCase()}`}
        athleteHrefBase="/coach/students"
        rankScope={scope}
        compareHref="/coach/compare"
      />
    </AppShell>
  );
}
