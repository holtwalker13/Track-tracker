import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isClassYear } from "@/lib/grades";

export async function POST(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Class name is required" }, { status: 400 });
  const period = String(body.period ?? "").trim() || null;
  const gradeRaw = body.gradeLevel != null && body.gradeLevel !== "" ? Number(body.gradeLevel) : null;
  const gradeLevel = gradeRaw != null && isClassYear(gradeRaw) ? gradeRaw : null;

  const coach = await prisma.coachProfile.findFirst({
    where: { userId: session.userId, schoolId: session.schoolId },
  });

  const rec = await prisma.class.create({
    data: {
      schoolId: session.schoolId,
      coachId: coach?.id,
      name,
      period,
      gradeLevel,
    },
  });

  return NextResponse.json({ id: rec.id });
}
