import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  AGE_BRACKETS,
  DEFAULT_AGE_BRACKET,
  KPI_UNITS,
  isAgeBracketId,
} from "@/lib/age-brackets";
import { MEDALS, type Medal } from "@/lib/kpi-targets";
import {
  createSchoolActivity,
  deleteSchoolCustomActivity,
} from "@/lib/services/school-activity-create";
import { listSchoolLifts } from "@/lib/queries/lifts";

const LIFT_UNITS = KPI_UNITS.filter((u) => ["lb", "reps", "x BW"].includes(u.id));

/** Create custom strength lift (same shape as KPI builder). */
export async function POST(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (body.action === "create") {
    const title = String(body.title ?? "").trim();
    const unit = String(body.unit ?? "lb").trim();
    const direction =
      body.direction === "LOWER_BETTER" ? "LOWER_BETTER" : "HIGHER_BETTER";
    const ageBrackets = Array.isArray(body.ageBrackets)
      ? body.ageBrackets.filter((b: string) => isAgeBracketId(String(b)))
      : [DEFAULT_AGE_BRACKET];
    const genders = Array.isArray(body.genders)
      ? body.genders.filter((g: string) => g === "F" || g === "M")
      : ["F", "M"];

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!LIFT_UNITS.some((u) => u.id === unit)) {
      return NextResponse.json({ error: "Invalid unit for a lift" }, { status: 400 });
    }

    try {
      const activity = await createSchoolActivity({
        schoolId: session.schoolId,
        title,
        categorySlug: "strength",
        unit,
        direction,
        ageBrackets,
        genders,
        targets: body.targets as
          | Record<string, Record<string, Record<string, number>>>
          | undefined,
      });
      return NextResponse.json({
        ok: true,
        activity: {
          slug: activity.slug,
          name: activity.name,
          unit: activity.unit,
          custom: true,
        },
      });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Could not create lift" },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function GET() {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lifts = await listSchoolLifts(session.schoolId);
  return NextResponse.json({
    lifts,
    units: LIFT_UNITS,
    ageBrackets: AGE_BRACKETS,
  });
}

export async function DELETE(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const slug = String(body.slug ?? "").trim();
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  const deleted = await deleteSchoolCustomActivity(session.schoolId, slug);
  if (deleted) {
    return NextResponse.json({ ok: true });
  }

  const global = await prisma.activity.findFirst({
    where: { slug, schoolId: null, category: { slug: "strength" } },
  });
  if (!global) {
    return NextResponse.json({ error: "Lift not found" }, { status: 404 });
  }

  await prisma.schoolHiddenLift.upsert({
    where: {
      schoolId_activitySlug: { schoolId: session.schoolId, activitySlug: slug },
    },
    create: { schoolId: session.schoolId, activitySlug: slug },
    update: {},
  });

  await prisma.schoolKpiTarget.deleteMany({
    where: { schoolId: session.schoolId, metricSlug: slug },
  });

  return NextResponse.json({ ok: true, hidden: true });
}

export async function PATCH(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const slug = String(body.slug ?? "").trim();
  const name = String(body.name ?? "").trim();
  if (!slug || !name) {
    return NextResponse.json({ error: "slug and name required" }, { status: 400 });
  }

  const activity = await prisma.activity.findFirst({
    where: {
      slug,
      category: { slug: "strength" },
      OR: [{ schoolId: session.schoolId }, { schoolId: null }],
    },
  });
  if (!activity) {
    return NextResponse.json({ error: "Lift not found" }, { status: 404 });
  }

  await prisma.activity.update({
    where: { id: activity.id },
    data: { name },
  });

  return NextResponse.json({ ok: true, name });
}
