import { NextResponse } from "next/server";
import {
  COACH_CLASS_CONTEXT_COOKIE,
  classesForCoachContext,
  serializeCoachClassContext,
} from "@/lib/coach-class-context";
import { sessionCookieOptions } from "@/lib/auth/cookie";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const classIdRaw = body.classId;
  const subgroupIdRaw = body.subgroupId;

  const classes = await classesForCoachContext({
    ...session,
    schoolId: session.schoolId,
  });
  const allowedClassIds = new Set(classes.map((c) => c.id));

  const classId: string | null =
    classIdRaw == null || classIdRaw === "" ? null : String(classIdRaw);
  if (classId && !allowedClassIds.has(classId)) {
    return NextResponse.json({ error: "Class not available" }, { status: 403 });
  }

  const subgroupId: string | null =
    subgroupIdRaw == null || subgroupIdRaw === "" ? null : String(subgroupIdRaw);

  if (subgroupId) {
    if (!classId) {
      return NextResponse.json({ error: "Select a class first" }, { status: 400 });
    }
    const sg = await prisma.classSubgroup.findFirst({
      where: { id: subgroupId, classId },
    });
    if (!sg) {
      return NextResponse.json({ error: "Subgroup not found" }, { status: 404 });
    }
  }

  const payload = serializeCoachClassContext({ classId, subgroupId });
  const res = NextResponse.json({ ok: true, classId, subgroupId });
  res.cookies.set(COACH_CLASS_CONTEXT_COOKIE, payload, {
    ...sessionCookieOptions(60 * 60 * 24 * 90),
    httpOnly: true,
  });
  return res;
}
