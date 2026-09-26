/** Leaderboard time windows: day / week / month / semester. */

export type LeaderboardPeriod = "day" | "week" | "month" | "semester";

export const LEADERBOARD_PERIODS: {
  id: LeaderboardPeriod;
  label: string;
  shortLabel: string;
}[] = [
  { id: "day", label: "Today", shortLabel: "Day" },
  { id: "week", label: "This week", shortLabel: "Week" },
  { id: "month", label: "This month", shortLabel: "Month" },
  { id: "semester", label: "Semester", shortLabel: "Semester" },
];

export const DEFAULT_LEADERBOARD_PERIOD: LeaderboardPeriod = "week";

export function isLeaderboardPeriod(v: string | null | undefined): v is LeaderboardPeriod {
  return LEADERBOARD_PERIODS.some((p) => p.id === v);
}

export function parseLeaderboardPeriod(v?: string | null): LeaderboardPeriod {
  return isLeaderboardPeriod(v) ? v : DEFAULT_LEADERBOARD_PERIOD;
}

export function periodLabel(period: LeaderboardPeriod): string {
  return LEADERBOARD_PERIODS.find((p) => p.id === period)?.label ?? period;
}

/** Inclusive start of the window (local calendar), end = now-ish / end of today. */
export function periodDateRange(
  period: LeaderboardPeriod,
  now = new Date(),
  semester?: { startDate: Date; endDate: Date } | null
): { start: Date; end: Date } {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (period === "semester" && semester?.startDate) {
    const start = new Date(semester.startDate);
    start.setHours(0, 0, 0, 0);
    const semEnd = new Date(semester.endDate);
    semEnd.setHours(23, 59, 59, 999);
    return { start, end: semEnd < end ? semEnd : end };
  }

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === "day") {
    return { start, end };
  }
  if (period === "week") {
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday start
    start.setDate(start.getDate() - diff);
    return { start, end };
  }
  if (period === "month") {
    start.setDate(1);
    return { start, end };
  }
  // semester fallback: ~5 months back if no school year dates
  start.setMonth(start.getMonth() - 5);
  return { start, end };
}
