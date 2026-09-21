import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { listImportableActivities, marksTemplateCsv } from "@/lib/services/import-marks";

export async function GET() {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const activities = await listImportableActivities(session.schoolId);
  const csv = marksTemplateCsv(activities);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="kpi-marks-template.csv"',
    },
  });
}
