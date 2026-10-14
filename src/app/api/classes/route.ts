import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isClassYear } from "@/lib/grades";
import { parseCoachIds, setClassCoaches } from "@/lib/services/class-coaches";
import { listSchoolClasses, schoolClassHourOptions } from "@/lib/queries/roster";

export async function GET() {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const classes = await listSchoolClasses(session.schoolId);
  return NextResponse.json({ classes: schoolClassHourOptions(classes) });
}

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

  let coachIds = parseCoachIds(body);
  if (coachIds === undefined) {
    coachIds = selfCoach?.id ? [selfCoach.id] : [];
  }

  if (coachIds.length === 0) {
    return NextResponse.json({ error: "Assign at least one coach to this class" }, { status: 400 });
  }

  const rec = await prisma.class.create({
    data: {
      schoolId: session.schoolId,
      name,
      period,
      gradeLevel,
      programKind,
    },
  });

  try {
    await setClassCoaches(rec.id, session.schoolId, coachIds);
  } catch (err) {
    await prisma.class.delete({ where: { id: rec.id } }).catch(() => undefined);
    const message = err instanceof Error ? err.message : "Could not assign coaches";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ id: rec.id });
}
