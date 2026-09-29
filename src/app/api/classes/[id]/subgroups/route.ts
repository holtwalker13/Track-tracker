import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { listClassSubgroups } from "@/lib/queries/class-subgroups";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: classId } = await params;

  const cls = await prisma.class.findFirst({
    where: { id: classId, schoolId: session.schoolId },
    select: { id: true },
  });
  if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  const subgroups = await listClassSubgroups(classId);
  return NextResponse.json({ subgroups });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: classId } = await params;
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const memberIds: string[] = Array.isArray(body.memberIds)
    ? Array.from(new Set(body.memberIds.map((id: unknown) => String(id))))
    : [];

  if (!name) {
    return NextResponse.json({ error: "Subgroup name is required" }, { status: 400 });
  }

  const cls = await prisma.class.findFirst({
    where: { id: classId, schoolId: session.schoolId },
    include: { enrollments: { select: { studentId: true } } },
  });
  if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  const enrolled = new Set(cls.enrollments.map((e) => e.studentId));
  const validMembers = memberIds.filter((id) => enrolled.has(id));

  const maxOrder = await prisma.classSubgroup.aggregate({
    where: { classId },
    _max: { sortOrder: true },
  });

  const subgroup = await prisma.classSubgroup.create({
    data: {
      classId,
      name,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      members: {
        create: validMembers.map((studentId) => ({ studentId })),
      },
    },
    include: { members: { select: { studentId: true } } },
  });

  return NextResponse.json({
    subgroup: {
      id: subgroup.id,
      name: subgroup.name,
      sortOrder: subgroup.sortOrder,
      memberIds: subgroup.members.map((m) => m.studentId),
    },
  });
}
