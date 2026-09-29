import { prisma } from "@/lib/db";

export type ClassSubgroupSummary = {
  id: string;
  name: string;
  sortOrder: number;
  memberIds: string[];
};

export async function listClassSubgroups(classId: string): Promise<ClassSubgroupSummary[]> {
  const rows = await prisma.classSubgroup.findMany({
    where: { classId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      members: { select: { studentId: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    sortOrder: r.sortOrder,
    memberIds: r.members.map((m) => m.studentId),
  }));
}

export async function studentIdsInSubgroup(subgroupId: string): Promise<string[]> {
  const rows = await prisma.classSubgroupMember.findMany({
    where: { subgroupId },
    select: { studentId: true },
  });
  return rows.map((r) => r.studentId);
}
