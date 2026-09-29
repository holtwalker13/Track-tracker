import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isClassYear } from "@/lib/grades";
import { claimClassForCoach, coachCanManageClass, coachProfileForSession } from "@/lib/auth/coach-scope";
import { parseCoachIds, setClassCoaches } from "@/lib/services/class-coaches";

export async function PATCH(
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
    include: { _count: { select: { coachAssignments: true } } },
  });
  if (!cls) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!(await coachCanManageClass(session, id))) {
    return NextResponse.json(
      { error: "This class is led by another coach." },
      { status: 403 }
    );
  }

  const profile = await coachProfileForSession(session);
  if (profile && cls.coachId == null && cls._count.coachAssignments === 0) {
    await claimClassForCoach(id, profile.id);
  }

  const body = await request.json();
  const coachIds = parseCoachIds(body);

  const coachesOnly =
    body.name === undefined &&
    body.period === undefined &&
    body.gradeLevel === undefined &&
    body.programKind === undefined &&
    coachIds !== undefined;

  if (coachesOnly) {
    try {
      const assigned = await setClassCoaches(id, session.schoolId, coachIds);
      return NextResponse.json({ ok: true, coachIds: assigned });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update coaches";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const period = body.period == null || body.period === "" ? null : String(body.period).trim();
  let gradeLevel: number | null = null;
  if (body.gradeLevel != null && body.gradeLevel !== "") {
    const n = Number(body.gradeLevel);
    if (!isClassYear(n)) {
      return NextResponse.json({ error: "Invalid graduating class" }, { status: 400 });
    }
    gradeLevel = n;
  }

  let programKind: string | null | undefined = undefined;
  if (body.programKind !== undefined) {
    const pk = String(body.programKind ?? "").toUpperCase();
    programKind = pk === "SCHOLASTIC" || pk === "TRAINING" ? pk : null;
  }

  const updated = await prisma.class.update({
    where: { id },
    data: {
      name,
      period,
      gradeLevel,
      ...(programKind !== undefined ? { programKind } : {}),
    },
  });

  if (coachIds !== undefined) {
    try {
      await setClassCoaches(id, session.schoolId, coachIds);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update coaches";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true, class: updated });
}

export async function DELETE(
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
  });
  if (!cls) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!(await coachCanManageClass(session, id))) {
    return NextResponse.json({ error: "This class is led by another coach." }, { status: 403 });
  }

  await prisma.class.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
