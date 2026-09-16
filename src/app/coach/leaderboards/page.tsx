import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { getLeaderboardGrid } from "@/lib/queries/leaderboard-grid";
import { LeaderboardGrid } from "@/components/leaderboards/leaderboard-grid";

export default async function CoachLeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string }>;
}) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) redirect("/login");
  const sp = await searchParams;
  const grade = sp.grade ? parseInt(sp.grade, 10) : undefined;

  const { boards, gradeLevel } = await getLeaderboardGrid(
    session.schoolId,
    false,
    grade
  );

  return (
    <AppShell title="Leaderboards" nav={COACH_NAV}>
      <form className="mb-6 flex flex-wrap gap-3">
        <select
          name="grade"
          defaultValue={sp.grade ?? ""}
          className="rounded-lg border border-card-border bg-background px-3 py-2"
        >
          <option value="">All grades</option>
          {[6, 7, 8, 9, 10, 11, 12].map((g) => (
            <option key={g} value={g}>Grade {g}</option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-sport-gold px-4 py-2 font-semibold text-background">
          Apply
        </button>
      </form>
      <LeaderboardGrid
        boards={boards}
        subtitle={
          gradeLevel
            ? `Top 10 per event · Grade ${gradeLevel} · current school year`
            : "Top 10 per event · all grades · current school year"
        }
      />
    </AppShell>
  );
}
