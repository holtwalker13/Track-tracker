/** Age / grade bands for PE-focused KPI targets across years. */

export type AgeBracketId =
  | "elem-k-2"
  | "elem-3-5"
  | "middle-6-8"
  | "high-9-12";

export type AgeBracket = {
  id: AgeBracketId;
  label: string;
  shortLabel: string;
  description: string;
};

export const AGE_BRACKETS: AgeBracket[] = [
  {
    id: "elem-k-2",
    label: "Elementary K–2",
    shortLabel: "K–2",
    description: "Early elementary PE fundamentals",
  },
  {
    id: "elem-3-5",
    label: "Elementary 3–5",
    shortLabel: "3–5",
    description: "Upper elementary PE",
  },
  {
    id: "middle-6-8",
    label: "Middle 6–8",
    shortLabel: "6–8",
    description: "Middle school / junior high",
  },
  {
    id: "high-9-12",
    label: "High school 9–12",
    shortLabel: "9–12",
    description: "High school athletics & PE",
  },
];

export const DEFAULT_AGE_BRACKET: AgeBracketId = "high-9-12";

export function isAgeBracketId(v: string): v is AgeBracketId {
  return AGE_BRACKETS.some((b) => b.id === v);
}

export function ageBracketLabel(id: string) {
  return AGE_BRACKETS.find((b) => b.id === id)?.label ?? id;
}

/**
 * Map graduating class year to a KPI age band.
 * `schoolYearEnd` is the calendar year the current school year ends (e.g. 2026 for 2025–26).
 * Seniors ≈ grade 12; each extra year until graduation steps down one grade.
 */
export function ageBracketForClassYear(
  classYear: number | null | undefined,
  schoolYearEnd = new Date().getFullYear()
): AgeBracketId {
  if (classYear == null || !Number.isFinite(classYear)) return DEFAULT_AGE_BRACKET;
  const yearsUntilGrad = classYear - schoolYearEnd;
  const approxGrade = 12 - yearsUntilGrad;
  if (approxGrade <= 2) return "elem-k-2";
  if (approxGrade <= 5) return "elem-3-5";
  if (approxGrade <= 8) return "middle-6-8";
  return "high-9-12";
}

/** @deprecated Prefer ageBracketForClassYear — kept as alias for callers using "grade". */
export function ageBracketForGrade(
  grade: number | null | undefined,
  schoolYearEnd?: number
): AgeBracketId {
  return ageBracketForClassYear(grade, schoolYearEnd);
}

/** Units coaches can pick when building a KPI. */
export const KPI_UNITS: {
  id: string;
  label: string;
  directionDefault: "HIGHER_BETTER" | "LOWER_BETTER";
}[] = [
  { id: "seconds", label: "Seconds (time)", directionDefault: "LOWER_BETTER" },
  { id: "inches", label: "Inches", directionDefault: "HIGHER_BETTER" },
  { id: "meters", label: "Meters", directionDefault: "HIGHER_BETTER" },
  { id: "lb", label: "Pounds (lb)", directionDefault: "HIGHER_BETTER" },
  { id: "reps", label: "Reps / count", directionDefault: "HIGHER_BETTER" },
  { id: "x BW", label: "× Bodyweight", directionDefault: "HIGHER_BETTER" },
];

export const KPI_CATEGORIES = [
  { slug: "speed", name: "Speed" },
  { slug: "power", name: "Power" },
  { slug: "strength", name: "Strength" },
  { slug: "flexibility", name: "Flexibility" },
  { slug: "agility", name: "Agility" },
] as const;
