import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; subgroupId: string }> }
) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: classId, subgroupId } = await params;
  const body = await request.json();

  const subgroup = await prisma.classSubgroup.findFirst({
    where: { id: subgroupId, classId, class: { schoolId: session.schoolId } },
  });
  if (!subgroup) return NextResponse.json({ error: "Subgroup not found" }, { status: 404 });

  const name = body.name != null ? String(body.name).trim() : undefined;
  const memberIds: string[] | undefined = Array.isArray(body.memberIds)
    ? Array.from(new Set(body.memberIds.map((id: unknown) => String(id))))
    : undefined;

  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
  }

  if (memberIds !== undefined) {
    const enrollments = await prisma.classEnrollment.findMany({
      where: { classId },
      select: { studentId: true },
    });
    const enrolled = new Set(enrollments.map((e) => e.studentId));
    const validMembers = memberIds.filter((id) => enrolled.has(id));

    await prisma.$transaction([
      prisma.classSubgroupMember.deleteMany({ where: { subgroupId } }),
      ...(validMembers.length
        ? [
            prisma.classSubgroupMember.createMany({
              data: validMembers.map((studentId) => ({ subgroupId, studentId })),
            }),
          ]
        : []),
    ]);
  }

  if (name !== undefined) {
    await prisma.classSubgroup.update({ where: { id: subgroupId }, data: { name } });
  }

  const updated = await prisma.classSubgroup.findUnique({
    where: { id: subgroupId },
    include: { members: { select: { studentId: true } } },
  });

  return NextResponse.json({
    subgroup: updated
      ? {
          id: updated.id,
          name: updated.name,
          sortOrder: updated.sortOrder,
          memberIds: updated.members.map((m) => m.studentId),
        }
      : null,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; subgroupId: string }> }
) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: classId, subgroupId } = await params;

  const subgroup = await prisma.classSubgroup.findFirst({
    where: { id: subgroupId, classId, class: { schoolId: session.schoolId } },
  });
  if (!subgroup) return NextResponse.json({ error: "Subgroup not found" }, { status: 404 });

  await prisma.classSubgroup.delete({ where: { id: subgroupId } });
  return NextResponse.json({ ok: true });
}
