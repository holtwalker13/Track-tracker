import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { getLeaderboard } from "@/lib/queries/coach";
import { formatActivityValue } from "@/lib/format";

export default async function CoachLeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ activity?: string; grade?: string }>;
}) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) redirect("/login");
  const sp = await searchParams;
  const activitySlug = sp.activity ?? "vertical-jump";
  const grade = sp.grade ? parseInt(sp.grade, 10) : undefined;

  const { activity, entries } = await getLeaderboard(
    session.schoolId,
    activitySlug,
    false,
    grade
  );

  return (
    <AppShell title="Leaderboards" nav={COACH_NAV}>
      <form className="mb-6 flex flex-wrap gap-3">
        <select name="activity" defaultValue={activitySlug} className="rounded-lg border border-card-border bg-background px-3 py-2">
          <option value="vertical-jump">Vertical Jump</option>
          <option value="standing-broad-jump">Broad Jump</option>
          <option value="pull-ups">Pull-Ups</option>
          <option value="100-meter-dash">100m Dash</option>
        </select>
        <select name="grade" defaultValue={sp.grade ?? ""} className="rounded-lg border border-card-border bg-background px-3 py-2">
          <option value="">All grades</option>
          {[6, 7, 8, 9, 10, 11, 12].map((g) => (
            <option key={g} value={g}>Grade {g}</option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-background">Apply</button>
      </form>
      <Card>
        <CardTitle>{activity.name} — current school year</CardTitle>
        <ol className="mt-4 space-y-2">
          {entries.slice(0, 25).map((e) => (
            <li key={e.rank} className="flex justify-between text-sm">
              <span>{e.rank}. {e.displayName}</span>
              <span className="font-mono font-semibold text-accent">
                {formatActivityValue(e.value, activity.unit, activity.slug)}
              </span>
            </li>
          ))}
        </ol>
      </Card>
    </AppShell>
  );
}
