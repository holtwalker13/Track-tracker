import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  createKpiSet,
  ensureCoachActiveKpiSet,
  listKpiSetsForCoach,
  setCoachActiveKpiSet,
} from "@/lib/services/kpi-sets";
import { COACHING_SPORTS } from "@/lib/sports";

async function coachContext(session: { userId: string; schoolId?: string; role: string }) {
  if (!session.schoolId) return null;
  try {
    const ctx = await ensureCoachActiveKpiSet(session.userId, session.schoolId);
    return ctx;
  } catch {
    if (session.role === "ADMIN") {
      const anyCoach = await prisma.coachProfile.findFirst({
        where: { schoolId: session.schoolId },
      });
      if (!anyCoach) return null;
      return ensureCoachActiveKpiSet(anyCoach.userId, session.schoolId);
    }
    return null;
  }
}

export async function GET() {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await coachContext(session);
  if (!ctx) {
    return NextResponse.json({ error: "No coach profile for this school" }, { status: 400 });
  }

  const { own, publicFromOthers } = await listKpiSetsForCoach({
    schoolId: session.schoolId,
    coachProfileId: ctx.coach.id,
    includePublicFromOthers: true,
  });

  return NextResponse.json({
    activeSetId: ctx.activeSet.id,
    own,
    publicFromOthers,
    sports: COACHING_SPORTS,
  });
}

export async function POST(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await coachContext(session);
  if (!ctx) {
    return NextResponse.json({ error: "No coach profile for this school" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));

  if (body.action === "activate") {
    try {
      const set = await setCoachActiveKpiSet(
        ctx.coach.id,
        session.schoolId,
        String(body.kpiSetId ?? "")
      );
      return NextResponse.json({ ok: true, set });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Could not activate set" },
        { status: 400 }
      );
    }
  }

  try {
    const set = await createKpiSet({
      schoolId: session.schoolId,
      coachProfileId: ctx.coach.id,
      name: String(body.name ?? ""),
      sport: String(body.sport ?? ""),
      description: body.description != null ? String(body.description) : null,
      isPublic: Boolean(body.isPublic),
      makeActive: body.makeActive !== false,
    });
    return NextResponse.json({ ok: true, set });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not create KPI set" },
      { status: 400 }
    );
  }
}
