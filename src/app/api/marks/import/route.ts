import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { importHistoricalMarks } from "@/lib/services/import-marks";

export async function POST(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload a CSV file" }, { status: 400 });
  }
  const csvText = await file.text();
  const school = await prisma.school.findUnique({
    where: { id: session.schoolId },
    select: { organizationId: true },
  });
  if (!school) {
    return NextResponse.json({ error: "School not found" }, { status: 404 });
  }

  const result = await importHistoricalMarks({
    schoolId: session.schoolId,
    organizationId: school.organizationId,
    enteredById: session.userId,
    csvText,
  });
  if ("error" in result && result.error) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
