import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const cls = await prisma.class.findFirst({
    where: { id, schoolId: session.schoolId },
  });
  if (!cls) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const studentIds: string[] = Array.isArray(body.studentIds) ? body.studentIds : [];

  await prisma.classEnrollment.deleteMany({ where: { classId: id } });
  if (studentIds.length > 0) {
    const allowed = await prisma.studentProfile.findMany({
      where: { schoolId: session.schoolId, id: { in: studentIds } },
      select: { id: true },
    });
    await prisma.classEnrollment.createMany({
      data: allowed.map((s) => ({ classId: id, studentId: s.id })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ ok: true, count: studentIds.length });
}
