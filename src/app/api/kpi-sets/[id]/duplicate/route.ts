import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  duplicateKpiSet,
  ensureCoachActiveKpiSet,
  type KpiSetMetricState,
  type KpiSetTargetCell,
} from "@/lib/services/kpi-sets";
import { MEDALS, type Medal } from "@/lib/kpi-targets";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let coachId: string | null = null;
  try {
    const ctx = await ensureCoachActiveKpiSet(session.userId, session.schoolId);
    coachId = ctx.coach.id;
  } catch {
    if (session.role === "ADMIN") {
      const anyCoach = await prisma.coachProfile.findFirst({
        where: { schoolId: session.schoolId },
      });
      coachId = anyCoach?.id ?? null;
    }
  }
  if (!coachId) {
    return NextResponse.json({ error: "No coach profile" }, { status: 400 });
  }

  const { id: sourceSetId } = await params;
  const body = await request.json().catch(() => ({}));

  const cells = Array.isArray(body.cells)
    ? (body.cells as KpiSetTargetCell[]).map((c) => ({
        gender: (c.gender === "M" ? "M" : "F") as "F" | "M",
        medal: (MEDALS.includes(c.medal as Medal) ? c.medal : "bronze") as Medal,
        metricSlug: String(c.metricSlug ?? ""),
        target:
          c.target == null || !Number.isFinite(Number(c.target))
            ? null
            : Number(c.target),
        ageBracket: String(c.ageBracket ?? ""),
      }))
    : undefined;

  const metrics = Array.isArray(body.metrics)
    ? (body.metrics as KpiSetMetricState[])
    : undefined;

  try {
    const set = await duplicateKpiSet({
      sourceSetId,
      coachProfileId: coachId,
      schoolId: session.schoolId,
      name: String(body.name ?? ""),
      sport: String(body.sport ?? ""),
      description: body.description != null ? String(body.description) : null,
      isPublic: Boolean(body.isPublic),
      cells,
      metrics,
      makeActive: body.makeActive !== false,
    });
    return NextResponse.json({ ok: true, set });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not duplicate KPI set" },
      { status: 400 }
    );
  }
}
