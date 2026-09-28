import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  deleteKpiSet,
  ensureCoachActiveKpiSet,
  getKpiSetById,
  saveKpiSetTargets,
  updateKpiSetMeta,
  type KpiSetMetricState,
  type KpiSetTargetCell,
} from "@/lib/services/kpi-sets";
import { MEDALS, type Medal } from "@/lib/kpi-targets";

async function resolveCoachId(userId: string, schoolId: string, role: string) {
  try {
    const ctx = await ensureCoachActiveKpiSet(userId, schoolId);
    return ctx.coach.id;
  } catch {
    if (role === "ADMIN") {
      const anyCoach = await prisma.coachProfile.findFirst({ where: { schoolId } });
      return anyCoach?.id ?? null;
    }
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const set = await getKpiSetById(id);
  if (!set) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const coachId = await resolveCoachId(session.userId, session.schoolId, session.role);
  const canView =
    set.coachProfileId === coachId ||
    set.isPublic ||
    set.schoolId === session.schoolId;
  if (!canView) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ set });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const coachId = await resolveCoachId(session.userId, session.schoolId, session.role);
  if (!coachId) {
    return NextResponse.json({ error: "No coach profile" }, { status: 400 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    if (body.action === "save-targets" || Array.isArray(body.cells)) {
      const cells = (Array.isArray(body.cells) ? body.cells : []) as KpiSetTargetCell[];
      const metrics = Array.isArray(body.metrics)
        ? (body.metrics as KpiSetMetricState[])
        : undefined;
      const normalized: KpiSetTargetCell[] = cells.map((c) => ({
        gender: c.gender === "M" ? "M" : "F",
        medal: (MEDALS.includes(c.medal as Medal) ? c.medal : "bronze") as Medal,
        metricSlug: String(c.metricSlug ?? ""),
        target:
          c.target == null || c.target === ("" as unknown)
            ? null
            : Number.isFinite(Number(c.target))
              ? Number(c.target)
              : null,
        ageBracket: String(c.ageBracket ?? ""),
      }));
      const set = await saveKpiSetTargets(id, coachId, {
        cells: normalized,
        metrics,
      });
      return NextResponse.json({ ok: true, set });
    }

    const set = await updateKpiSetMeta(id, coachId, {
      name: body.name != null ? String(body.name) : undefined,
      sport: body.sport != null ? String(body.sport) : undefined,
      description: body.description !== undefined ? body.description : undefined,
      isPublic: body.isPublic != null ? Boolean(body.isPublic) : undefined,
    });
    return NextResponse.json({ ok: true, set });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not update KPI set" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const coachId = await resolveCoachId(session.userId, session.schoolId, session.role);
  if (!coachId) {
    return NextResponse.json({ error: "No coach profile" }, { status: 400 });
  }
  const { id } = await params;
  try {
    await deleteKpiSet(id, coachId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not delete KPI set" },
      { status: 400 }
    );
  }
}
