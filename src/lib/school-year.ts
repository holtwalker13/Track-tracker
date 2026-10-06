import { prisma } from "@/lib/db";

/** School year that contains a calendar testing date (falls back to current / latest). */
export async function resolveSchoolYearForDate(schoolId: string, testingDate: Date) {
  const years = await prisma.schoolYear.findMany({
    where: { schoolId },
    orderBy: { startDate: "asc" },
  });
  if (years.length === 0) return null;
  const current = years.find((y) => y.isCurrent) ?? years[years.length - 1]!;
  return (
    years.find((y) => testingDate >= y.startDate && testingDate <= y.endDate) ?? current
  );
}
