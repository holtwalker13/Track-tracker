export const GRADE_LEVELS = [6, 7, 8, 9, 10, 11, 12] as const;
export type GradeLevel = (typeof GRADE_LEVELS)[number];

export function parseGradesParam(value?: string | null): number[] {
  if (!value || value.trim() === "") return [...GRADE_LEVELS];
  const parsed = value
    .split(",")
    .map((part) => parseInt(part.trim(), 10))
    .filter((n): n is GradeLevel => (GRADE_LEVELS as readonly number[]).includes(n));
  const unique = [...new Set(parsed)].sort((a, b) => a - b);
  return unique.length > 0 ? unique : [...GRADE_LEVELS];
}

export function gradesFromSearch(sp: { grade?: string; grades?: string }): number[] {
  if (sp.grades) return parseGradesParam(sp.grades);
  if (sp.grade) return parseGradesParam(sp.grade);
  return [...GRADE_LEVELS];
}

export function isAllGrades(grades: number[]): boolean {
  return grades.length === GRADE_LEVELS.length;
}

export function gradesLabel(grades: number[]): string {
  if (isAllGrades(grades)) return "all grades";
  if (grades.length === 1) return `Grade ${grades[0]}`;
  return `Grades ${grades.join(", ")}`;
}

/** Prisma `where.gradeLevel` — omit when every grade is selected. */
export function gradeLevelWhere(grades: number[]): { in: number[] } | undefined {
  if (isAllGrades(grades) || grades.length === 0) return undefined;
  return { in: grades };
}
