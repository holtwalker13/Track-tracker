import { prisma } from "@/lib/db";

const studentSelect = {
  id: true,
  firstName: true,
  lastName: true,
  studentNumber: true,
} as const;

export type WorkoutAssignmentStudent = {
  id: string;
  firstName: string;
  lastName: string;
  studentNumber: string;
};

/** Students who should receive a workout assignment (subgroup, individual, or full class). */
export async function studentsTargetedByWorkoutAssignment(input: {
  /** Unused by the roster lookup; kept for call-site clarity. */
  assignmentId?: string;
  classId?: string | null;
  subgroupId?: string | null;
  studentId?: string | null;
}): Promise<WorkoutAssignmentStudent[]> {
  if (input.studentId) {
    const student = await prisma.studentProfile.findUnique({
      where: { id: input.studentId },
      select: studentSelect,
    });
    return student ? [student] : [];
  }

  if (input.subgroupId) {
    const members = await prisma.classSubgroupMember.findMany({
      where: { subgroupId: input.subgroupId },
      include: { student: { select: studentSelect } },
      orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
    });
    return members.map((m) => m.student);
  }

  if (input.classId) {
    const enrollments = await prisma.classEnrollment.findMany({
      where: { classId: input.classId },
      include: { student: { select: studentSelect } },
      orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
    });
    return enrollments.map((e) => e.student);
  }

  return [];
}
