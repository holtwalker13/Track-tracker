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

/** Single-grade pages (roster / analytics). Defaults to grade 7. */
export function singleGradeFromSearch(
  sp: { grade?: string; grades?: string },
  fallback = 7
): number {
  if (sp.grade) {
    const n = parseInt(sp.grade, 10);
    if ((GRADE_LEVELS as readonly number[]).includes(n)) return n;
  }
  if (sp.grades) {
    const list = parseGradesParam(sp.grades);
    if (list.length === 1) return list[0]!;
  }
  return fallback;
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
