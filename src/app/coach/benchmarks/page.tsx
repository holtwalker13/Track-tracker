import { AppShell } from "@/components/layout/app-shell";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { ensureSchoolKpiTargets } from "@/lib/queries/kpi";
import { prisma } from "@/lib/db";
import { KpiTargetsEditor, type TargetCell } from "@/components/kpi/kpi-targets-editor";
import { ImportMarksForm } from "@/components/kpi/import-marks-form";
import { KPI_METRIC_META, MEDALS, type Medal } from "@/lib/kpi-targets";
import { DEFAULT_AGE_BRACKET } from "@/lib/age-brackets";

export default async function BenchmarksPage() {
  const session = await requireSchoolSession();

  await ensureSchoolKpiTargets(session.schoolId);

  await prisma.activityCategory.upsert({
    where: { slug: "flexibility" },
    create: { slug: "flexibility", name: "Flexibility", sortOrder: 40 },
    update: {},
  });

  const [rows, customActivities, catalogActivities, hidden] = await Promise.all([
    prisma.schoolKpiTarget.findMany({ where: { schoolId: session.schoolId } }),
    prisma.activity.findMany({
      where: { schoolId: session.schoolId },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    prisma.activity.findMany({
      where: { schoolId: null, slug: { in: KPI_METRIC_META.map((m) => m.slug) } },
      select: { slug: true, name: true, unit: true },
    }),
    prisma.schoolHiddenKpi.findMany({
      where: { schoolId: session.schoolId },
      select: { metricSlug: true },
    }),
  ]);

  const hiddenSet = new Set(hidden.map((h) => h.metricSlug));
  const catalogName = new Map(catalogActivities.map((a) => [a.slug, a]));

  const initial: TargetCell[] = rows
    .filter((r) => MEDALS.includes(r.medal as Medal) && !hiddenSet.has(r.metricSlug))
    .map((r) => ({
      gender: r.gender === "M" ? "M" : "F",
      medal: r.medal as Medal,
      metricSlug: r.metricSlug,
      target: r.target,
      ageBracket: r.ageBracket || DEFAULT_AGE_BRACKET,
    }));

  const metrics = [
    ...KPI_METRIC_META.filter((m) => !hiddenSet.has(m.slug)).map((m) => {
      const live = catalogName.get(m.slug);
      return {
        slug: m.slug,
        name: live?.name ?? m.name,
        unit: live?.unit ?? m.unit,
        custom: false as const,
      };
    }),
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
      <div className="mt-8 max-w-2xl">
        <ImportMarksForm />
      </div>
    </AppShell>
  );
}
