import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { linkProvisionalStudent } from "@/lib/services/provisional-student";

export async function POST(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const result = await linkProvisionalStudent({
    schoolId: session.schoolId,
    provisionalStudentId: String(body.provisionalStudentId ?? ""),
    officialStudentId: String(body.officialStudentId ?? ""),
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
