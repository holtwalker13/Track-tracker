import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  AGE_BRACKETS,
  DEFAULT_AGE_BRACKET,
  KPI_UNITS,
  isAgeBracketId,
} from "@/lib/age-brackets";
import {
  createSchoolActivity,
  deleteSchoolCustomActivity,
} from "@/lib/services/school-activity-create";
import { getSchoolLiftEditDetails, listSchoolLifts } from "@/lib/queries/lifts";
import { syncSchoolLiftTargets } from "@/lib/services/school-lift-update";
import {
  descriptionForLiftGroup,
  type LiftBodyGroup,
} from "@/lib/lift-groups";

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

    const rawGroup = String(body.bodyGroup ?? "other");
    const liftGroup: LiftBodyGroup =
      rawGroup === "legs" || rawGroup === "back" || rawGroup === "arms" ? rawGroup : "other";

    try {
      const activity = await createSchoolActivity({
        schoolId: session.schoolId,
        title,
        categorySlug: "strength",
        unit,
        direction,
        ageBrackets,
        genders,
        liftGroup,
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

export async function GET(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = new URL(request.url).searchParams.get("slug")?.trim();
  if (slug) {
    const lift = await getSchoolLiftEditDetails(session.schoolId, slug);
    if (!lift) {
      return NextResponse.json({ error: "Lift not found" }, { status: 404 });
    }
    return NextResponse.json({ lift });
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
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
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

  const title = String(body.title ?? body.name ?? activity.name).trim();
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const unit = body.unit != null ? String(body.unit).trim() : activity.unit;
  if (body.unit != null && !LIFT_UNITS.some((u) => u.id === unit)) {
    return NextResponse.json({ error: "Invalid unit for a lift" }, { status: 400 });
  }

  const direction =
    body.direction === "LOWER_BETTER"
      ? "LOWER_BETTER"
      : body.direction === "HIGHER_BETTER"
        ? "HIGHER_BETTER"
        : activity.scoringDirection === "LOWER_BETTER"
          ? "LOWER_BETTER"
          : "HIGHER_BETTER";

  const ageBrackets = Array.isArray(body.ageBrackets)
    ? body.ageBrackets.filter((b: string) => isAgeBracketId(String(b)))
    : undefined;
  const genders = Array.isArray(body.genders)
    ? (body.genders.filter((g: string) => g === "F" || g === "M") as Array<"F" | "M">)
    : undefined;

  await prisma.activity.update({
    where: { id: activity.id },
    data: {
      name: title,
      unit,
      scoringDirection: direction,
      bodyweightInfluenced: unit === "x BW",
      acceptsDecimals: unit !== "reps",
      ...(body.bodyGroup != null && activity.schoolId != null
        ? {
            description: descriptionForLiftGroup(
              (["legs", "back", "arms", "other"] as const).includes(body.bodyGroup)
                ? body.bodyGroup
                : "other"
            ),
          }
        : {}),
    },
  });

  if (body.targets != null) {
    await syncSchoolLiftTargets({
      schoolId: session.schoolId,
      metricSlug: slug,
      ageBrackets: ageBrackets?.length ? ageBrackets : [DEFAULT_AGE_BRACKET],
      genders: genders?.length ? genders : ["F", "M"],
      targets: body.targets as
        | Record<string, Record<string, Record<string, number>>>
        | undefined,
    });
  }

  return NextResponse.json({
    ok: true,
    activity: {
      slug: activity.slug,
      name: title,
      unit,
      custom: activity.schoolId != null,
      forWorkouts: unit === "lb" || unit === "reps",
    },
  });
}
