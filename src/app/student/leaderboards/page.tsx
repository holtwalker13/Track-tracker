import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { STUDENT_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { getStudentContext } from "@/lib/queries/student";
import { getStudentLeaderboard } from "@/lib/queries/leaderboard-student";
import { formatActivityValue } from "@/lib/format";

export default async function StudentLeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ activity?: string }>;
}) {
  const session = await requireSession(["STUDENT"]);
  if (!session?.studentId) redirect("/login");
  const sp = await searchParams;
  const { student, currentGrade } = await getStudentContext(session.studentId);
  const activitySlug = sp.activity ?? "vertical-jump";

  const { activity, entries } = await getStudentLeaderboard(
    student.schoolId,
    activitySlug,
    session.studentId,
    currentGrade
  );

  return (
    <AppShell title="Leaderboards" nav={STUDENT_NAV}>
      <form className="mb-4">
        <select name="activity" defaultValue={activitySlug} className="rounded-lg border border-card-border bg-background px-3 py-2">
          <option value="vertical-jump">Vertical Jump</option>
          <option value="standing-broad-jump">Broad Jump</option>
          <option value="pull-ups">Pull-Ups</option>
          <option value="100-meter-dash">100m Dash</option>
        </select>
        <button type="submit" className="ml-2 rounded-lg bg-accent px-4 py-2 text-background">View</button>
      </form>
      <Card>
        <CardTitle>Grade {currentGrade} — {activity.name}</CardTitle>
        <ol className="mt-4 space-y-2">
          {entries.slice(0, 20).map((e) => (
            <li
              key={e.rank}
              className={`flex justify-between ${e.displayName === "You" ? "font-bold text-accent" : ""}`}
            >
              <span>{e.rank}. {e.displayName}</span>
              <span>{formatActivityValue(e.value, activity.unit, activity.slug)}</span>
            </li>
          ))}
        </ol>
      </Card>
    </AppShell>
  );
}
