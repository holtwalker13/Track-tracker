import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { prisma } from "@/lib/db";
import { isGraduatingClassName } from "@/lib/periods";
import { dayBoundsFromDateString } from "@/lib/services/workouts";

export type ProgramsCoachOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type ProgramsClassOption = {
  id: string;
  name: string;
  period: string | null;
  coachId: string | null;
};

export type CalendarAssignment = {
  id: string;
  date: string;
  templateId: string;
  templateName: string;
  completedCount: number;
  totalCount: number;
};

/** Sunday start (Sun–Sat school week). */
export function weekStartSunday(dateStr: string): string {
  const d = parseISO(dateStr);
  return format(startOfWeek(d, { weekStartsOn: 0 }), "yyyy-MM-dd");
}

export function dateRangeDays(startStr: string, dayCount: number): string[] {
  const start = parseISO(startStr);
  return Array.from({ length: dayCount }, (_, i) => format(addDays(start, i), "yyyy-MM-dd"));
}

export async function listSchoolCoaches(schoolId: string): Promise<ProgramsCoachOption[]> {
  const rows = await prisma.coachProfile.findMany({
    where: { schoolId },
    orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
    select: {
      id: true,
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    firstName: r.user.firstName,
    lastName: r.user.lastName,
    email: r.user.email,
  }));
}

export async function listClassesForCoach(
  schoolId: string,
  coachProfileId: string
): Promise<ProgramsClassOption[]> {
  const rows = await prisma.class.findMany({
    where: { schoolId, coachId: coachProfileId },
    orderBy: [{ period: "asc" }, { name: "asc" }],
    select: { id: true, name: true, period: true, coachId: true },
  });
  return rows.filter((c) => !isGraduatingClassName(c.name));
}

export async function listAssignmentsForClassRange(input: {
  schoolId: string;
  classId: string;
  startDate: string;
  endDate: string;
}): Promise<CalendarAssignment[]> {
  const startBounds = dayBoundsFromDateString(input.startDate);
  const endBounds = dayBoundsFromDateString(input.endDate);
  if (!startBounds || !endBounds) return [];

  const assignments = await prisma.workoutAssignment.findMany({
    where: {
      schoolId: input.schoolId,
      classId: input.classId,
      scheduledDate: { gte: startBounds.start, lte: endBounds.end },
    },
    include: {
      template: { select: { id: true, name: true } },
      sessions: { select: { status: true } },
      class: {
        select: {
          enrollments: { select: { studentId: true } },
        },
      },
    },
    orderBy: [{ scheduledDate: "asc" }, { createdAt: "asc" }],
  });

  return assignments.map((a) => {
    const date = a.scheduledDate.toISOString().slice(0, 10);
    const rosterSize = a.class?.enrollments.length ?? 0;
    const totalCount = Math.max(rosterSize, a.sessions.length);
    const completedCount = a.sessions.filter((s) => s.status === "COMPLETED").length;
    return {
      id: a.id,
      date,
      templateId: a.template.id,
      templateName: a.template.name,
      completedCount,
      totalCount,
    };
  });
}
