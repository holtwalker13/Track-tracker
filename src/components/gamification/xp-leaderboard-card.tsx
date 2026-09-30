import { Card, CardTitle } from "@/components/ui/card";
import { getXpLeaderboard } from "@/lib/gamification/engine";

export async function XpLeaderboardCard({
  schoolId,
  studentId,
}: {
  schoolId: string;
  studentId: string;
}) {
  const entries = await getXpLeaderboard(schoolId, 15);
  if (entries.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardTitle>XP leaderboard</CardTitle>
      <p className="mt-1 text-sm text-muted">
        Participation and progress — separate from strength rankings.
      </p>
      <ol className="mt-4 space-y-2">
        {entries.map((e) => (
          <li
            key={e.studentId}
            className={`flex justify-between text-sm ${
              e.studentId === studentId ? "font-semibold text-accent" : ""
            }`}
          >
            <span>
              #{e.rank} {e.studentId === studentId ? "You" : e.displayName}
            </span>
            <span>
              Lvl {e.level} · {e.lifetimeXp} XP
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
