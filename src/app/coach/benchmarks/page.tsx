import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { ensureSchoolKpiTargets } from "@/lib/queries/kpi";
import { prisma } from "@/lib/db";
import { KpiTargetsEditor, type TargetCell } from "@/components/kpi/kpi-targets-editor";
import { KPI_METRIC_META, MEDALS, type Medal } from "@/lib/kpi-targets";
import { DEFAULT_AGE_BRACKET } from "@/lib/age-brackets";

export default async function BenchmarksPage() {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) redirect("/login");

  await ensureSchoolKpiTargets(session.schoolId);

  // Ensure flexibility category exists for PE builders.
  await prisma.activityCategory.upsert({
    where: { slug: "flexibility" },
    create: { slug: "flexibility", name: "Flexibility", sortOrder: 40 },
    update: {},
  });

  const [rows, customActivities] = await Promise.all([
    prisma.schoolKpiTarget.findMany({ where: { schoolId: session.schoolId } }),
    prisma.activity.findMany({
      where: { schoolId: session.schoolId },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const initial: TargetCell[] = rows
    .filter((r) => MEDALS.includes(r.medal as Medal))
    .map((r) => ({
      gender: r.gender === "M" ? "M" : "F",
      medal: r.medal as Medal,
      metricSlug: r.metricSlug,
      target: r.target,
      ageBracket: r.ageBracket || DEFAULT_AGE_BRACKET,
    }));

  const metrics = [
    ...KPI_METRIC_META.map((m) => ({
      slug: m.slug,
      name: m.name,
      unit: m.unit,
      custom: false as const,
    })),
    ...customActivities.map((a) => ({
      slug: a.slug,
      name: a.name,
      unit: a.unit,
      categorySlug: a.category.slug,
      custom: true as const,
    })),
  ];

  return (
    <AppShell title="KPI targets" nav={COACH_NAV}>
      <KpiTargetsEditor initial={initial} metrics={metrics} />
    </AppShell>
  );
}
