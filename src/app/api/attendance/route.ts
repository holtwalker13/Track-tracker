import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { coachCanAdministerTestsForClass } from "@/lib/auth/coach-scope";
import {
  isAttendanceDate,
  listClassAttendanceRoster,
} from "@/lib/queries/attendance";
import {
  deleteClassAttendanceForDate,
  markClassAttendanceAll,
  upsertClassAttendance,
} from "@/lib/services/attendance";

export async function GET(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const classId = url.searchParams.get("classId")?.trim() ?? "";
  const date = url.searchParams.get("date")?.trim() ?? "";
  const subgroupId = url.searchParams.get("subgroupId")?.trim() || null;

  if (!classId) return NextResponse.json({ error: "classId is required" }, { status: 400 });
  if (!isAttendanceDate(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }
  if (!(await coachCanAdministerTestsForClass(session, classId))) {
    return NextResponse.json({ error: "You can only view attendance for a class you lead." }, { status: 403 });
  }

  const students = await listClassAttendanceRoster({
    schoolId: session.schoolId,
    classId,
    date,
    subgroupId,
  });
  return NextResponse.json({ date, classId, students });
}

export async function PATCH(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const result = await upsertClassAttendance({
    session,
    classId: String(body.classId ?? ""),
    date: String(body.date ?? ""),
    studentId: String(body.studentId ?? ""),
    present: Boolean(body.present),
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const result = await markClassAttendanceAll({
    session,
    classId: String(body.classId ?? ""),
    date: String(body.date ?? ""),
    present: Boolean(body.present),
    subgroupId: body.subgroupId ? String(body.subgroupId) : null,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, count: result.count });
}

export async function DELETE(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const classId = url.searchParams.get("classId")?.trim() ?? "";
  const date = url.searchParams.get("date")?.trim() ?? "";
  if (!classId) return NextResponse.json({ error: "classId is required" }, { status: 400 });

  const result = await deleteClassAttendanceForDate({ session, classId, date });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, count: result.count });
}
