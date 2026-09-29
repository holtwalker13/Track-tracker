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
  const programKindRaw = String(body.programKind ?? "").toUpperCase();
  const programKind =
    programKindRaw === "SCHOLASTIC" || programKindRaw === "TRAINING" ? programKindRaw : null;

  const selfCoach = await prisma.coachProfile.findFirst({
    where: { userId: session.userId, schoolId: session.schoolId },
    select: { id: true },
  });

  let coachId: string | null = null;
  if (body.coachId !== undefined) {
    const raw = body.coachId == null || body.coachId === "" ? null : String(body.coachId);
    if (raw) {
      const assigned = await prisma.coachProfile.findFirst({
        where: { id: raw, schoolId: session.schoolId },
        select: { id: true },
      });
      if (!assigned) {
        return NextResponse.json({ error: "Coach not found at this school" }, { status: 400 });
      }
      coachId = assigned.id;
    }
  } else {
    coachId = selfCoach?.id ?? null;
  }

  if (!coachId) {
    return NextResponse.json(
      { error: "Assign a coach to this class" },
      { status: 400 }
    );
  }

  const rec = await prisma.class.create({
    data: {
      schoolId: session.schoolId,
      coachId,
      name,
      period,
      gradeLevel,
      programKind,
    },
  });

  return NextResponse.json({ id: rec.id });
}
