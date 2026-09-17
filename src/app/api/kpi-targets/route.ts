import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { KPI_METRIC_META, MEDALS, type Medal } from "@/lib/kpi-targets";

export async function POST(request: Request) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const cells = Array.isArray(body.cells) ? body.cells : [];
  const slugs = new Set<string>(KPI_METRIC_META.map((m) => m.slug));

  for (const cell of cells) {
    const gender = cell.gender === "M" ? "M" : "F";
    const medal = MEDALS.includes(cell.medal as Medal) ? (cell.medal as Medal) : null;
    const metricSlug = String(cell.metricSlug ?? "");
    const target = Number(cell.target);
    if (!medal || !slugs.has(metricSlug) || !Number.isFinite(target)) continue;
    await prisma.schoolKpiTarget.upsert({
      where: {
        schoolId_gender_medal_metricSlug: {
          schoolId: session.schoolId,
          gender,
          medal,
          metricSlug,
        },
      },
      create: {
        schoolId: session.schoolId,
        gender,
        medal,
        metricSlug,
        target,
      },
      update: { target },
    });
  }

  return NextResponse.json({ ok: true });
}
