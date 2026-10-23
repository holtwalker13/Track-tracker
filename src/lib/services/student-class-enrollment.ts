import { prisma } from "@/lib/db";

/** Enroll a student in a class and optionally place them in one subgroup of that class. */
export async function enrollStudentInClass(
  schoolId: string,
  studentId: string,
  classId: string,
  subgroupId?: string | null
) {
  const cls = await prisma.class.findFirst({
    where: { id: classId, schoolId },
    select: { id: true },
  });
  if (!cls) throw new Error("Class not found");

  await prisma.classEnrollment.createMany({
    data: [{ classId, studentId }],
    skipDuplicates: true,
  });

  if (!subgroupId) return;

  const subgroup = await prisma.classSubgroup.findFirst({
    where: { id: subgroupId, classId },
    select: { id: true },
  });
  if (!subgroup) throw new Error("Subgroup not found");

  const classSubgroups = await prisma.classSubgroup.findMany({
    where: { classId },
    select: { id: true },
  });
  const subgroupIds = classSubgroups.map((s) => s.id);

  await prisma.$transaction([
    prisma.classSubgroupMember.deleteMany({
      where: { studentId, subgroupId: { in: subgroupIds } },
    }),
    prisma.classSubgroupMember.create({
      data: { subgroupId, studentId },
    }),
  ]);
}
