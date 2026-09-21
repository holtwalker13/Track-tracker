import { NextResponse } from "next/server";
import { requireSession, replaceSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await requireSession(["ADMIN"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const schoolId = typeof body.schoolId === "string" ? body.schoolId : "";
  if (!schoolId) {
    await replaceSession({ userId: session.userId, role: "ADMIN" });
    return NextResponse.json({ ok: true, schoolId: null });
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) {
    return NextResponse.json({ error: "School not found" }, { status: 404 });
  }

  await replaceSession({
    userId: session.userId,
    role: "ADMIN",
    schoolId: school.id,
  });

  return NextResponse.json({ ok: true, schoolId: school.id, name: school.name });
}
