import { prisma } from "@/lib/db";
import type { AssignmentCompletionRow } from "@/lib/gamification/streaks";

export async function getStudentAssignmentCompletionRows(
  studentId: string
): Promise<AssignmentCompletionRow[]> {
  const enrollments = await prisma.classEnrollment.findMany({
    where: { studentId },
    select: { classId: true },
  });
  const classIds = enrollments.map((e) => e.classId);

  const assignments = await prisma.workoutAssignment.findMany({
    where: {
      OR: [
        { studentId },
        ...(classIds.length > 0
          ? [{ classId: { in: classIds }, studentId: null }]
          : []),
      ],
    },
    orderBy: [{ scheduledDate: "asc" }, { createdAt: "asc" }],
    include: {
      sessions: {
        where: { studentId },
        select: { status: true },
      },
    },
  });

  // Subgroup assignments only count for athletes who belong to the subgroup.
  const memberSubgroups = await prisma.classSubgroupMember.findMany({
    where: { studentId },
    select: { subgroupId: true },
  });
  const subgroupSet = new Set(memberSubgroups.map((m) => m.subgroupId));

  return assignments
    .filter((a) => !a.subgroupId || subgroupSet.has(a.subgroupId))
    .map((a) => ({
      assignmentId: a.id,
      scheduledDate: a.scheduledDate,
      completed: a.sessions.some((s) => s.status === "COMPLETED"),
    }));
}

/** Monday-based week key (local UTC date of assignment). */
export function weekKeyForDate(date: Date): string {
  const d = new Date(date);
  d.setUTCHours(12, 0, 0, 0);
  const day = d.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diffToMonday);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dayOfMonth}`;
}

export function assignmentsInWeek(
  rows: AssignmentCompletionRow[],
  weekKey: string
): AssignmentCompletionRow[] {
  return rows.filter((r) => weekKeyForDate(r.scheduledDate) === weekKey);
}
