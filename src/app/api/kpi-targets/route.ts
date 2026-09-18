import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { KPI_METRIC_META, MEDALS, type Medal } from "@/lib/kpi-targets";
import {
  AGE_BRACKETS,
  DEFAULT_AGE_BRACKET,
  isAgeBracketId,
  KPI_CATEGORIES,
  KPI_UNITS,
} from "@/lib/age-brackets";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

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
    if (!KPI_CATEGORIES.some((c) => c.slug === categorySlug)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    if (!KPI_UNITS.some((u) => u.id === unit)) {
      return NextResponse.json({ error: "Invalid unit" }, { status: 400 });
    }
    if (ageBrackets.length === 0) {
      return NextResponse.json({ error: "Pick at least one age band" }, { status: 400 });
    }

    let category = await prisma.activityCategory.findUnique({
      where: { slug: categorySlug },
    });
    if (!category) {
      category = await prisma.activityCategory.create({
        data: {
          slug: categorySlug,
          name: KPI_CATEGORIES.find((c) => c.slug === categorySlug)?.name ?? categorySlug,
          sortOrder: 50,
        },
      });
    }

    const base = slugify(title) || "custom-kpi";
    let slug = `school-${session.schoolId.slice(-6)}-${base}`;
    let n = 1;
    while (await prisma.activity.findUnique({ where: { slug } })) {
      slug = `school-${session.schoolId.slice(-6)}-${base}-${n++}`;
    }

    const activity = await prisma.activity.create({
      data: {
        slug,
        name: title,
        categoryId: category.id,
        unit,
        scoringDirection: direction,
        acceptsDecimals: unit !== "reps",
        schoolId: session.schoolId,
        genderInfluenced: true,
        ageInfluenced: true,
      },
    });

    const medals = body.targets as
      | Record<string, Record<string, Record<string, number>>>
      | undefined;
    // targets[ageBracket][gender][medal] = number
    if (medals) {
      const rows: {
        schoolId: string;
        gender: string;
        medal: string;
        metricSlug: string;
        target: number;
        ageBracket: string;
      }[] = [];
      for (const bracket of ageBrackets) {
        for (const gender of genders) {
          for (const medal of MEDALS) {
            const target = Number(medals?.[bracket]?.[gender]?.[medal]);
            if (!Number.isFinite(target)) continue;
            rows.push({
              schoolId: session.schoolId,
              gender,
              medal,
              metricSlug: activity.slug,
              target,
              ageBracket: bracket,
            });
          }
        }
      }
      if (rows.length) {
        await prisma.schoolKpiTarget.createMany({ data: rows, skipDuplicates: true });
      }
    }

    return NextResponse.json({ ok: true, activity: { id: activity.id, slug: activity.slug, name: activity.name } });
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
    await prisma.$transaction([
      prisma.schoolKpiTarget.deleteMany({
        where: { schoolId: session.schoolId, metricSlug: slug },
      }),
      prisma.schoolHiddenKpi.deleteMany({
        where: { schoolId: session.schoolId, metricSlug: slug },
      }),
      prisma.testingSessionActivity.deleteMany({ where: { activityId: custom.id } }),
      prisma.benchmarkValue.deleteMany({ where: { activityId: custom.id } }),
      prisma.performanceResult.deleteMany({ where: { activityId: custom.id } }),
      prisma.activity.delete({ where: { id: custom.id } }),
    ]);
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

/** Rename a KPI activity. */
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
      OR: [{ schoolId: session.schoolId }, { schoolId: null }],
    },
  });
  if (!activity) {
    return NextResponse.json({ error: "KPI not found" }, { status: 404 });
  }

  // Prefer updating school-owned copy; for global catalog update name in place (single-tenant).
  await prisma.activity.update({
    where: { id: activity.id },
    data: { name },
  });

  return NextResponse.json({ ok: true, name });
}

export async function GET() {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
