/** Graduating class years — the roster is grouped by class, not grade 6–12. */
export const GRADE_LEVELS = [2026, 2027, 2028, 2029, 2030, 2031] as const;
export type GradeLevel = (typeof GRADE_LEVELS)[number];

export const DEFAULT_CLASS_YEAR = 2028;

export function isClassYear(n: number): n is GradeLevel {
  return (GRADE_LEVELS as readonly number[]).includes(n);
}

export function classYearShort(year: number): string {
  return `'${String(year).slice(-2)}`;
}

export function classYearLabel(year: number): string {
  return `Class of ${year}`;
}

export function parseGradesParam(value?: string | null): number[] {
  if (!value || value.trim() === "") return [...GRADE_LEVELS];
  const parsed = value
    .split(",")
    .map((part) => parseInt(part.trim(), 10))
    .filter((n): n is GradeLevel => isClassYear(n));
  const unique = [...new Set(parsed)].sort((a, b) => a - b);
  return unique.length > 0 ? unique : [...GRADE_LEVELS];
}

export function gradesFromSearch(sp: { grade?: string; grades?: string }): number[] {
  if (sp.grades) return parseGradesParam(sp.grades);
  if (sp.grade) return parseGradesParam(sp.grade);
  return [...GRADE_LEVELS];
}

/** Single-class pages (roster / analytics). Defaults to Class of 2028. */
export function singleGradeFromSearch(
  sp: { grade?: string; grades?: string },
  fallback = DEFAULT_CLASS_YEAR
): number {
  if (sp.grade) {
    const n = parseInt(sp.grade, 10);
    if (isClassYear(n)) return n;
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
  if (isAllGrades(grades)) return "all classes";
  if (grades.length === 1) return classYearLabel(grades[0]!);
  return grades.map(classYearShort).join(", ");
}

/** Prisma `where.gradeLevel` — omit when every class is selected. */
export function gradeLevelWhere(grades: number[]): { in: number[] } | undefined {
  if (isAllGrades(grades) || grades.length === 0) return undefined;
  return { in: grades };
}
