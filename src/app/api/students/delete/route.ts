import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.studentIds)
    ? body.studentIds.map((id: unknown) => String(id)).filter(Boolean)
    : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "No students selected" }, { status: 400 });
  }

  const students = await prisma.studentProfile.findMany({
    where: { id: { in: ids }, schoolId: session.schoolId },
    select: { id: true, userId: true },
  });

  if (students.length !== ids.length) {
    return NextResponse.json({ error: "One or more students were not found" }, { status: 404 });
  }

  const userIds = students.map((s) => s.userId).filter((u): u is string => u != null);

  await prisma.$transaction([
    prisma.studentProfile.deleteMany({
      where: { id: { in: students.map((s) => s.id) } },
    }),
    ...(userIds.length
      ? [prisma.user.deleteMany({ where: { id: { in: userIds } } })]
      : []),
  ]);

  return NextResponse.json({ ok: true, deleted: students.length });
}
