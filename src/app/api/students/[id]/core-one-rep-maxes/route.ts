import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { saveStudentCoreOneRepMaxes } from "@/lib/queries/student-core-one-rep-max";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const student = await prisma.studentProfile.findUnique({ where: { id }, select: { schoolId: true } });
  if (!student || student.schoolId !== session.schoolId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { listStudentCoreOneRepMaxRows } = await import("@/lib/queries/student-core-one-rep-max");
  const rows = await listStudentCoreOneRepMaxRows(session.schoolId, id);
  return NextResponse.json({ rows });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const student = await prisma.studentProfile.findUnique({ where: { id }, select: { schoolId: true } });
  if (!student || student.schoolId !== session.schoolId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const marks = Array.isArray(body.marks) ? body.marks : [];
  const updates: { slug: string; valueLb: number | null }[] = [];
  for (const row of marks) {
    const slug = String(row.slug ?? "").trim();
    if (!slug) continue;
    if (row.valueLb == null || row.valueLb === "") {
      updates.push({ slug, valueLb: null });
      continue;
    }
    const valueLb = Number(row.valueLb);
    if (!Number.isFinite(valueLb) || valueLb <= 0) {
      return NextResponse.json({ error: `Invalid weight for ${slug}` }, { status: 400 });
    }
    updates.push({ slug, valueLb: Math.round(valueLb * 10) / 10 });
  }

  await saveStudentCoreOneRepMaxes(id, updates);
  const { listStudentCoreOneRepMaxRows } = await import("@/lib/queries/student-core-one-rep-max");
  const rows = await listStudentCoreOneRepMaxRows(session.schoolId, id);
  return NextResponse.json({ ok: true, rows });
}
