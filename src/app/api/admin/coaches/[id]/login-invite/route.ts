import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { createOrRefreshCoachLoginInvite } from "@/lib/services/coach-login-invite";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const session = await requireSession(["ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Enter a school first" }, { status: 401 });
  }

  const { id: coachProfileId } = await context.params;
  const coach = await prisma.coachProfile.findUnique({
    where: { id: coachProfileId },
    select: { id: true, schoolId: true },
  });

  if (!coach || coach.schoolId !== session.schoolId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const invite = await createOrRefreshCoachLoginInvite(coachProfileId, session.userId);
    return NextResponse.json({
      ok: true,
      urlPath: invite.urlPath,
      expiresAt: invite.expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("[coach-login-invite]", err);
    return NextResponse.json({ error: "Unable to create login link." }, { status: 400 });
  }
}
