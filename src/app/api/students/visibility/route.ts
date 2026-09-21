import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const ids = Array.isArray(body.studentIds) ? body.studentIds.map(String) : [];
  const nameHidden = Boolean(body.nameHidden);
  if (ids.length === 0) {
    return NextResponse.json({ error: "Pick at least one athlete" }, { status: 400 });
  }

  const result = await prisma.studentProfile.updateMany({
    where: { id: { in: ids }, schoolId: session.schoolId },
    data: { nameHidden },
  });

  return NextResponse.json({ ok: true, updated: result.count });
}
