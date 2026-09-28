import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { canAccessStudentRecord } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { createOrRefreshStudentLoginInvite } from "@/lib/services/student-login-invite";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: studentId } = await context.params;
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      schoolId: true,
      user: { select: { passwordSetAt: true } },
    },
  });

  if (!student || student.schoolId !== session.schoolId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    !canAccessStudentRecord(session, student.id, student.schoolId) ||
    session.role === "STUDENT"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const invite = await createOrRefreshStudentLoginInvite(studentId, session.userId);
    return NextResponse.json({
      ok: true,
      urlPath: invite.urlPath,
      expiresAt: invite.expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("[login-invite]", err);
    const raw = err instanceof Error ? err.message : "";
    const needsMigration =
      raw.includes("studentLoginInvite") ||
      raw.includes("StudentLoginInvite") ||
      raw.includes("passwordSetAt");
    const message = needsMigration
      ? "Login links are not available until the database is updated (run db push on deploy)."
      : "Unable to create login link. Try again or contact support.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
