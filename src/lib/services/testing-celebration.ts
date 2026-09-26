import { getLeaderboard } from "@/lib/queries/coach";
import type { LeaderboardPeriod } from "@/lib/leaderboard-periods";
import { LEADERBOARD_PERIODS } from "@/lib/leaderboard-periods";

export type PeriodBoardHit = {
  period: LeaderboardPeriod;
  rank: number;
  total: number;
};

/** After a save, see where this athlete sits on day/week/month/semester boards. */
export async function getPeriodBoardHits(input: {
  schoolId: string;
  activitySlug: string;
  studentId: string;
  gender?: string | null;
}): Promise<PeriodBoardHit[]> {
  const hits: PeriodBoardHit[] = [];
  for (const p of LEADERBOARD_PERIODS) {
    const { entries } = await getLeaderboard(input.schoolId, input.activitySlug, {
      period: p.id,
      gender: input.gender ?? undefined,
      scope: "school",
    });
    const me = entries.find((e) => e.studentId === input.studentId);
    if (me) {
      hits.push({ period: p.id, rank: me.rank, total: entries.length });
    }
  }
  return hits;
}

export function shouldCelebrate(pr: boolean, hits: PeriodBoardHit[]): boolean {
  if (pr) return true;
  // Ignore solo boards (only athlete logged) — that was firing confetti on every first mark.
  return hits.some((h) => h.rank <= 3 && h.total >= 2);
}

export function celebrationLabel(pr: boolean, hits: PeriodBoardHit[]): string | null {
  if (pr) return "New Record!";
  const best = hits
    .filter((h) => h.rank <= 3 && h.total >= 2)
    .sort((a, b) => a.rank - b.rank)[0];
  if (!best) return null;
  const window =
    best.period === "day"
      ? "today"
      : best.period === "week"
        ? "this week"
        : best.period === "month"
          ? "this month"
          : "this semester";
  if (best.rank === 1) return `#1 ${window}!`;
  return `#${best.rank} ${window}`;
}
