/**
 * Projection ranges are estimates based on benchmark trajectories — not guarantees.
 */

export type ProjectionScenario = "conservative" | "typical" | "aggressive";

export type GradeBenchmarkPoint = {
  gradeLevel: number;
  p50: number;
};

export type ProjectionResult = {
  currentValue: number;
  targetGrade: number;
  scenarios: Record<
    ProjectionScenario,
    { value: number; label: string }
  >;
  benchmarkTrajectory: GradeBenchmarkPoint[];
  disclaimer: string;
};

const DISCLAIMER =
  "Projected ranges are estimates based on historical performance trends and benchmark populations. They are not guaranteed outcomes.";

export function calculateProjection(input: {
  currentGrade: number;
  targetGrade: number;
  currentValue: number;
  benchmarkByGrade: GradeBenchmarkPoint[];
  studentTrendPerGrade?: number;
}): ProjectionResult {
  const { currentGrade, targetGrade, currentValue, benchmarkByGrade, studentTrendPerGrade } =
    input;
  const sorted = [...benchmarkByGrade].sort((a, b) => a.gradeLevel - b.gradeLevel);
  const currentBench =
    sorted.find((b) => b.gradeLevel === currentGrade)?.p50 ?? currentValue;
  const targetBench =
    sorted.find((b) => b.gradeLevel === targetGrade)?.p50 ?? currentBench;

  const benchGrowth = targetBench - currentBench;
  const studentGrowth =
    studentTrendPerGrade != null
      ? studentTrendPerGrade * (targetGrade - currentGrade)
      : benchGrowth;

  const typical = currentValue + studentGrowth;
  const conservative = currentValue + benchGrowth * 0.6;
  const aggressive = currentValue + Math.max(studentGrowth, benchGrowth) * 1.15;

  return {
    currentValue,
    targetGrade,
    benchmarkTrajectory: sorted,
    scenarios: {
      conservative: { value: conservative, label: "Conservative" },
      typical: { value: typical, label: "Typical" },
      aggressive: { value: aggressive, label: "Aggressive" },
    },
    disclaimer: DISCLAIMER,
  };
}
