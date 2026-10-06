import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { deleteSchoolCoach } from "@/lib/services/admin-coach";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireSession(["ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Enter a school first" }, { status: 401 });
  }

  const { id: coachProfileId } = await context.params;
  try {
    const removed = await deleteSchoolCoach({
      schoolId: session.schoolId,
      coachProfileId,
      actingUserId: session.userId,
    });
    return NextResponse.json({ ok: true, ...removed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not delete coach";
    const status = message === "Coach not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
