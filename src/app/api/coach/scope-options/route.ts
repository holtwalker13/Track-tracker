import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { coachProfileForSession } from "@/lib/auth/coach-scope";
import { listClassSubgroups } from "@/lib/queries/class-subgroups";
import { listClassesForCoach, listSchoolCoaches } from "@/lib/queries/programs-hub";

export async function GET(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const coachIdParam = url.searchParams.get("coachId")?.trim() ?? "";
  const classIdParam = url.searchParams.get("classId")?.trim() ?? "";

  const coaches = await listSchoolCoaches(session.schoolId);
  const myProfile = await coachProfileForSession(session);

  let coachId = coachIdParam;
  if (session.role === "COACH" && myProfile) {
    coachId = myProfile.id;
  } else if (!coachId || !coaches.some((c) => c.id === coachId)) {
    coachId =
      myProfile?.id && coaches.some((c) => c.id === myProfile.id)
        ? myProfile.id
        : coaches[0]?.id ?? "";
  }

  const classes = coachId
    ? await listClassesForCoach(session.schoolId, coachId)
    : [];

  let subgroups: { id: string; name: string }[] = [];
  if (classIdParam && classIdParam !== "all") {
    const allowed = classes.some((c) => c.id === classIdParam);
    if (!allowed) {
      return NextResponse.json({ error: "Class not available" }, { status: 403 });
    }
    const raw = await listClassSubgroups(classIdParam);
    subgroups = raw.map((s) => ({ id: s.id, name: s.name }));
  }

  return NextResponse.json({
    coachId,
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      period: c.period,
    })),
    subgroups,
  });
}
