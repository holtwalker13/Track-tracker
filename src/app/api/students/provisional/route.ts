import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createProvisionalStudent } from "@/lib/services/provisional-student";

export async function POST(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const result = await createProvisionalStudent({
    schoolId: session.schoolId,
    classId: String(body.classId ?? ""),
    firstName: String(body.firstName ?? ""),
    lastName: String(body.lastName ?? ""),
    date: body.date ? String(body.date) : null,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
