import { AppShell } from "@/components/layout/app-shell";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { getLeaderboardGrid } from "@/lib/queries/leaderboard-grid";
import { LeaderboardGrid } from "@/components/leaderboards/leaderboard-grid";
import { GradePills } from "@/components/ui/filter-pills";
import { GenderToggle } from "@/components/ui/gender-toggle";
import { RankScopeToggle } from "@/components/ui/rank-scope-toggle";
import { gradesFromSearch, gradesLabel } from "@/lib/grades";
import { parseGenderParam, genderFullLabel } from "@/lib/gender";

export default async function CoachLeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; grades?: string; gender?: string; scope?: string }>;
}) {
  const session = await requireSchoolSession();
  const sp = await searchParams;
  const grades = gradesFromSearch(sp);
  const gender = parseGenderParam(sp.gender);
  const scope = sp.scope === "global" ? "global" : "school";

  const { boards } = await getLeaderboardGrid(session.schoolId, grades, gender, scope, {
    role: session.role,
    schoolId: session.schoolId,
    studentId: session.studentId,
  });

  return (
    <AppShell title="Leaderboards" nav={COACH_NAV}>
      <div className="mb-6 space-y-4">
        <GradePills />
        <GenderToggle />
        <RankScopeToggle />
      </div>
      <LeaderboardGrid
        boards={boards}
        subtitle={`${scope === "global" ? "Global" : "School"} rank · ${gradesLabel(grades)} · ${genderFullLabel(gender).toLowerCase()}`}
        athleteHrefBase="/coach/students"
        compareHref="/coach/compare"
      />
    </AppShell>
  );
}
