import { prisma } from "@/lib/db";
import { formatActivityValue } from "@/lib/format";
import { gradeLevelWhere } from "@/lib/grades";
import type { AthleteGender } from "@/lib/gender";

export const ROSTER_COLUMNS: { slug: string; label: string }[] = [
  { slug: "weight", label: "BW" },
  { slug: "standing-broad-jump", label: "Broad" },
  { slug: "vertical-jump", label: "Vertical" },
  { slug: "pro-agility", label: "5-10-5" },
  { slug: "squat", label: "Squat" },
  { slug: "hang-clean", label: "Clean" },
  { slug: "bench-press", label: "Bench" },
  { slug: "flying-10-yard", label: "F10yd" },
  { slug: "flying-10-meter", label: "F10m" },
  { slug: "100-meter-dash", label: "Proj 100m" },
  { slug: "flying-20-meter", label: "F20m" },
  { slug: "20-meter-start", label: "20m Accel" },
  { slug: "40-yard-dash", label: "40yd" },
];

export type RosterMark = { value: number; display: string };

export type RosterAthlete = {
  studentId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  classYear: number | null;
  sports: string | null;
  marks: Record<string, RosterMark>;
};

export async function getClassRoster(
  schoolId: string,
  classYears: number[],
  gender: AthleteGender
): Promise<RosterAthlete[]> {
  const currentYear = await prisma.schoolYear.findFirst({
    where: { schoolId, isCurrent: true },
  });
  if (!currentYear) return [];

  const gradeFilter = gradeLevelWhere(classYears);

  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      schoolYearId: currentYear.id,
      ...(gradeFilter ? { gradeLevel: gradeFilter } : {}),
      student: { schoolId, gender },
    },
    include: { student: true },
    orderBy: [{ gradeLevel: "asc" }, { student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
  });

  const activities = await prisma.activity.findMany({
    where: { slug: { in: ROSTER_COLUMNS.map((c) => c.slug) } },
    select: { id: true, slug: true, unit: true },
  });
  const actById = new Map(activities.map((a) => [a.id, a]));

  const results = await prisma.performanceResult.findMany({
    where: {
      schoolId,
      schoolYearId: currentYear.id,
      status: "COMPLETED",
      isBestAttempt: true,
      resultValue: { not: null },
      studentId: { in: enrollments.map((e) => e.studentId) },
      activityId: { in: activities.map((a) => a.id) },
    },
  });

  const marksByStudent = new Map<string, Record<string, RosterMark>>();
  for (const r of results) {
    if (r.resultValue == null) continue;
    const act = actById.get(r.activityId);
    if (!act) continue;
    const bag = marksByStudent.get(r.studentId) ?? {};
    bag[act.slug] = {
      value: r.resultValue,
      display: r.displayValue ?? formatActivityValue(r.resultValue, act.unit, act.slug),
    };
    marksByStudent.set(r.studentId, bag);
  }

  return enrollments.map((e) => ({
    studentId: e.studentId,
    firstName: e.student.firstName,
    lastName: e.student.lastName,
    fullName: `${e.student.firstName} ${e.student.lastName}`,
    classYear: e.gradeLevel,
    sports: e.student.sports,
    marks: marksByStudent.get(e.studentId) ?? {},
  }));
}
