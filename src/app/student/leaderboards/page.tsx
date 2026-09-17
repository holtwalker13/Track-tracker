import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { STUDENT_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { getStudentContext } from "@/lib/queries/student";
import { getLeaderboardGrid } from "@/lib/queries/leaderboard-grid";
import { LeaderboardGrid } from "@/components/leaderboards/leaderboard-grid";

export default async function StudentLeaderboardsPage() {
  const session = await requireSession(["STUDENT"]);
  if (!session?.studentId) redirect("/login");

  const { student, currentGrade } = await getStudentContext(session.studentId);

  const { boards } = await getLeaderboardGrid(
    student.schoolId,
    true,
    currentGrade,
    session.studentId
  );

  return (
    <AppShell title="Leaderboards" nav={STUDENT_NAV}>
      <LeaderboardGrid
        boards={boards}
        subtitle={`Top 10 per event · Grade ${currentGrade} · anonymous peers · current school year`}
      />
    </AppShell>
  );
}
