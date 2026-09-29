import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createSchoolCoach, listSchoolCoaches } from "@/lib/services/admin-coach";

export async function GET() {
  const session = await requireSession(["ADMIN", "COACH"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Enter a school first" }, { status: 400 });
  }

  const coaches = await listSchoolCoaches(session.schoolId);
  return NextResponse.json({ coaches });
}

export async function POST(request: Request) {
  const session = await requireSession(["ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Enter a school first" }, { status: 400 });
  }

  const body = await request.json();
  try {
    const created = await createSchoolCoach({
      schoolId: session.schoolId,
      email: String(body.email ?? ""),
      firstName: String(body.firstName ?? ""),
      lastName: String(body.lastName ?? ""),
      createdByUserId: session.userId,
    });
    return NextResponse.json({ ok: true, ...created });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create coach";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
