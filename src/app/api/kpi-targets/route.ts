import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { KPI_METRIC_META, MEDALS, type Medal } from "@/lib/kpi-targets";
import {
  AGE_BRACKETS,
  DEFAULT_AGE_BRACKET,
  isAgeBracketId,
  KPI_UNITS,
} from "@/lib/age-brackets";
import {
  createSchoolActivity,
  deleteSchoolCustomActivity,
  loggedResultCountForActivitySlug,
  updateSchoolActivity,
} from "@/lib/services/school-activity-create";

/** Save target cells (existing + custom metrics). */
export async function POST(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Create a new custom KPI activity + optional targets
  if (body.action === "create") {
    const title = String(body.title ?? "").trim();
    const categorySlug = String(body.categorySlug ?? "").trim();
    const unit = String(body.unit ?? "").trim();
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
    if (!KPI_UNITS.some((u) => u.id === unit)) {
      return NextResponse.json({ error: "Invalid unit" }, { status: 400 });
    }
    if (ageBrackets.length === 0) {
      return NextResponse.json({ error: "Pick at least one age band" }, { status: 400 });
    }

    try {
      const activity = await createSchoolActivity({
        schoolId: session.schoolId,
        title,
        categorySlug,
        unit,
        direction,
        ageBrackets,
        genders: genders as Array<"F" | "M">,
        targets: body.targets as
          | Record<string, Record<string, Record<string, number>>>
          | undefined,
      });
      return NextResponse.json({
        ok: true,
        activity: { id: activity.id, slug: activity.slug, name: activity.name },
      });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Could not create KPI" },
        { status: 400 }
      );
    }
  }

  // Bulk save target cells
  const cells = Array.isArray(body.cells) ? body.cells : [];
  const knownSlugs = new Set<string>([
    ...KPI_METRIC_META.map((m) => m.slug),
    ...(
      await prisma.activity.findMany({
        where: { OR: [{ schoolId: session.schoolId }, { schoolId: null }] },
        select: { slug: true },
      })
    ).map((a) => a.slug),
  ]);

  for (const cell of cells) {
    const gender = cell.gender === "M" ? "M" : "F";
    const medal = MEDALS.includes(cell.medal as Medal) ? (cell.medal as Medal) : null;
    const metricSlug = String(cell.metricSlug ?? "");
    const target = Number(cell.target);
    const ageBracket = isAgeBracketId(String(cell.ageBracket ?? ""))
      ? String(cell.ageBracket)
      : DEFAULT_AGE_BRACKET;
    if (!medal || !knownSlugs.has(metricSlug) || !Number.isFinite(target)) continue;
    await prisma.schoolKpiTarget.upsert({
      where: {
        schoolId_gender_medal_metricSlug_ageBracket: {
          schoolId: session.schoolId,
          gender,
          medal,
          metricSlug,
          ageBracket,
        },
      },
      create: {
        schoolId: session.schoolId,
        gender,
        medal,
        metricSlug,
        target,
        ageBracket,
      },
      update: { target },
    });
  }

  return NextResponse.json({ ok: true });
}

/** Delete a KPI (custom activity hard-delete; built-in = hide for school + clear targets). */
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

  const custom = await prisma.activity.findFirst({
    where: { slug, schoolId: session.schoolId },
  });

  if (custom) {
    await deleteSchoolCustomActivity(session.schoolId, slug);
    return NextResponse.json({ ok: true });
  }

  const global = await prisma.activity.findFirst({
    where: { slug, schoolId: null },
  });
  if (!global && !KPI_METRIC_META.some((m) => m.slug === slug)) {
    return NextResponse.json({ error: "KPI not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.schoolKpiTarget.deleteMany({
      where: { schoolId: session.schoolId, metricSlug: slug },
    }),
    prisma.schoolHiddenKpi.upsert({
      where: {
        schoolId_metricSlug: { schoolId: session.schoolId, metricSlug: slug },
      },
      create: { schoolId: session.schoolId, metricSlug: slug },
      update: {},
    }),
  ]);

  return NextResponse.json({ ok: true, hidden: true });
}

/** Update KPI definition (same fields as create) or legacy name-only patch. */
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

  const fullUpdate =
    body.action === "update" ||
    body.categorySlug != null ||
    body.unit != null ||
    body.direction != null;

  if (!fullUpdate) {
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "slug and name required" }, { status: 400 });
    }
    const activity = await prisma.activity.findFirst({
      where: {
        slug,
        OR: [{ schoolId: session.schoolId }, { schoolId: null }],
      },
    });
    if (!activity) {
      return NextResponse.json({ error: "KPI not found" }, { status: 404 });
    }
    await prisma.activity.update({
      where: { id: activity.id },
      data: { name },
    });
    return NextResponse.json({ ok: true, name });
  }

  const title = String(body.title ?? body.name ?? "").trim();
  const categorySlug = String(body.categorySlug ?? "").trim();
  const unit = String(body.unit ?? "").trim();
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
  if (!KPI_UNITS.some((u) => u.id === unit)) {
    return NextResponse.json({ error: "Invalid unit" }, { status: 400 });
  }

  const existing = await prisma.activity.findFirst({
    where: {
      slug,
      OR: [{ schoolId: session.schoolId }, { schoolId: null }],
    },
    include: { category: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "KPI not found" }, { status: 404 });
  }

  const definitionChanged =
    existing.name !== title ||
    existing.category.slug !== categorySlug ||
    existing.unit !== unit ||
    existing.scoringDirection !== direction;

  const resultCount = await loggedResultCountForActivitySlug(slug);
  if (resultCount > 0 && definitionChanged && !body.acknowledgeLoggedData) {
    return NextResponse.json(
      {
        error: "This KPI has logged test results. Confirm to save changes anyway.",
        resultCount,
        requiresAcknowledgement: true,
      },
      { status: 409 }
    );
  }

  try {
    const activity = await updateSchoolActivity({
      schoolId: session.schoolId,
      slug,
      title,
      categorySlug,
      unit,
      direction,
      ageBrackets,
      genders: genders as Array<"F" | "M">,
      targets: body.targets as
        | Record<string, Record<string, Record<string, number>>>
        | undefined,
    });
    return NextResponse.json({
      ok: true,
      activity: {
        id: activity.id,
        slug: activity.slug,
        name: activity.name,
        unit: activity.unit,
        categorySlug: activity.category.slug,
        direction: activity.scoringDirection,
      },
      resultCount,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not update KPI" },
      { status: 400 }
    );
  }
}

export async function GET(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = new URL(request.url).searchParams.get("slug")?.trim();
  if (slug) {
    const activity = await prisma.activity.findFirst({
      where: {
        slug,
        OR: [{ schoolId: session.schoolId }, { schoolId: null }],
      },
      include: { category: true },
    });
    if (!activity) {
      return NextResponse.json({ error: "KPI not found" }, { status: 404 });
    }

    const [resultCount, targetRows] = await Promise.all([
      loggedResultCountForActivitySlug(slug),
      prisma.schoolKpiTarget.findMany({
        where: { schoolId: session.schoolId, metricSlug: slug },
      }),
    ]);

    const targets: Record<string, Record<string, Record<string, string>>> = {};
    for (const row of targetRows) {
      const b = row.ageBracket || DEFAULT_AGE_BRACKET;
      targets[b] ??= {};
      targets[b]![row.gender] ??= {};
      targets[b]![row.gender]![row.medal] = String(row.target);
    }

    const bracketSet = new Set<string>();
    const genderSet = new Set<string>();
    for (const row of targetRows) {
      bracketSet.add(row.ageBracket || DEFAULT_AGE_BRACKET);
      genderSet.add(row.gender);
    }

    return NextResponse.json({
      activity: {
        slug: activity.slug,
        name: activity.name,
        unit: activity.unit,
        categorySlug: activity.category.slug,
        direction: activity.scoringDirection,
        custom: activity.schoolId === session.schoolId,
      },
      resultCount,
      targets,
      ageBrackets: bracketSet.size ? [...bracketSet] : [DEFAULT_AGE_BRACKET],
      genders: genderSet.size ? [...genderSet] : ["F", "M"],
    });
  }

  const [targets, customActivities, categories, hidden] = await Promise.all([
    prisma.schoolKpiTarget.findMany({ where: { schoolId: session.schoolId } }),
    prisma.activity.findMany({
      where: { schoolId: session.schoolId },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    prisma.activityCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.schoolHiddenKpi.findMany({ where: { schoolId: session.schoolId } }),
  ]);

  return NextResponse.json({
    targets,
    customActivities,
    categories,
    hiddenSlugs: hidden.map((h) => h.metricSlug),
    ageBrackets: AGE_BRACKETS,
    units: KPI_UNITS,
  });
}
