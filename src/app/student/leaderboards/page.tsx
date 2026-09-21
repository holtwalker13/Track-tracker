import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { STUDENT_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { getStudentContext } from "@/lib/queries/student";
import { classYearLabel } from "@/lib/grades";
import { getLeaderboardGrid } from "@/lib/queries/leaderboard-grid";
import { LeaderboardGrid } from "@/components/leaderboards/leaderboard-grid";
import { RankScopeToggle } from "@/components/ui/rank-scope-toggle";

export default async function StudentLeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const session = await requireSession(["STUDENT"]);
  if (!session?.studentId) redirect("/login");

  const { student, currentGrade } = await getStudentContext(session.studentId);
  const sp = await searchParams;
  const scope = sp.scope === "global" ? "global" : "school";

  const { boards } = await getLeaderboardGrid(
    student.schoolId,
    [currentGrade],
    student.gender ?? undefined,
    scope,
    {
      role: "STUDENT",
      studentId: session.studentId,
      schoolId: student.schoolId,
    }
  );

  return (
    <AppShell title="Leaderboards" nav={STUDENT_NAV}>
      <div className="mb-6">
        <RankScopeToggle />
      </div>
      <LeaderboardGrid
        boards={boards}
        subtitle={`${scope === "global" ? "Global" : "School"} rank · ${classYearLabel(currentGrade)}`}
        selfHref="/student"
        rankScope={scope}
        compareHref="/student/compare"
      />
    </AppShell>
  );
}
