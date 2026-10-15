import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { classJoinPath } from "@/lib/services/class-join-link";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const cls = await prisma.class.findFirst({
    where: { id, schoolId: session.schoolId },
    select: { id: true },
  });
  if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  return NextResponse.json({ urlPath: classJoinPath(cls.id) });
}
