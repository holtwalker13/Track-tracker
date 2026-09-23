import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { fetchWorkoutLogExportRows } from "@/lib/queries/workout-logs";
import { workoutLogsToCsv } from "@/lib/services/workout-export";
import { dayBoundsFromDateString, todayDateString } from "@/lib/services/workouts";

export async function GET(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dateStr = url.searchParams.get("date")?.trim() || todayDateString();
  const classId = url.searchParams.get("classId")?.trim() || undefined;

  if (!dayBoundsFromDateString(dateStr)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const rows = await fetchWorkoutLogExportRows({
    schoolId: session.schoolId,
    dateStr,
    classId,
  });

  const csv = workoutLogsToCsv(rows);
  const suffix = classId ? "class" : "all";
  const filename = `workout-logs-${dateStr}-${suffix}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
