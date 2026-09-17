import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { getLeaderboardGrid } from "@/lib/queries/leaderboard-grid";
import { LeaderboardGrid } from "@/components/leaderboards/leaderboard-grid";
import { GradePills } from "@/components/ui/filter-pills";
import { GenderToggle } from "@/components/ui/gender-toggle";
import { gradesFromSearch, gradesLabel } from "@/lib/grades";
import { parseGenderParam, genderFullLabel } from "@/lib/gender";

export default async function CoachLeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; grades?: string; gender?: string }>;
}) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) redirect("/login");
  const sp = await searchParams;
  const grades = gradesFromSearch(sp);
  const gender = parseGenderParam(sp.gender);

  const { boards } = await getLeaderboardGrid(session.schoolId, false, grades, undefined, gender);

  return (
    <AppShell title="Leaderboards" nav={COACH_NAV}>
      <div className="mb-6 space-y-4">
        <GradePills />
        <GenderToggle />
      </div>
      <LeaderboardGrid
        boards={boards}
        subtitle={`Top 10 per event · featured: 40-Yard Dash & Vertical · ${gradesLabel(grades)} · ${genderFullLabel(gender).toLowerCase()} · current school year`}
        athleteHref={(studentId) => `/coach/students/${studentId}`}
      />
    </AppShell>
  );
}
