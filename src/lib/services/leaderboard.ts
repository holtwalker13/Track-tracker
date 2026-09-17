import type { ScoringDirection } from "@/lib/constants";

export type LeaderboardEntry = {
  studentId: string;
  rank: number;
  value: number;
  displayName: string;
  gradeLevel?: number;
  isPersonalRecord?: boolean;
};

export function rankResults<T extends { studentId: string; value: number }>(
  rows: T[],
  direction: ScoringDirection
): (T & { rank: number })[] {
  const bestPerStudent = new Map<string, T>();
  for (const row of rows) {
    const existing = bestPerStudent.get(row.studentId);
    if (!existing) {
      bestPerStudent.set(row.studentId, row);
      continue;
    }
    const better =
      direction === "HIGHER_BETTER"
        ? row.value > existing.value
        : row.value < existing.value;
    if (better) bestPerStudent.set(row.studentId, row);
  }
  const list = Array.from(bestPerStudent.values());
  list.sort((a, b) =>
    direction === "HIGHER_BETTER" ? b.value - a.value : a.value - b.value
  );
  return list.map((row, i) => ({ ...row, rank: i + 1 }));
}
