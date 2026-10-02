import { AppShell } from "@/components/layout/app-shell";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { resolveCoachClassContext } from "@/lib/coach-class-context";
import { prisma } from "@/lib/db";
import { KpiTargetsEditor, type TargetCell, type KpiSetSummary } from "@/components/kpi/kpi-targets-editor";
import { ImportMarksForm } from "@/components/kpi/import-marks-form";
import { KPI_METRIC_META, MEDALS, type Medal } from "@/lib/kpi-targets";
import { DEFAULT_AGE_BRACKET } from "@/lib/age-brackets";
import {
  ensureCoachActiveKpiSet,
  listKpiSetsForCoach,
  resolveKpiSetForClassContext,
} from "@/lib/services/kpi-sets";
import { classSectionLabel } from "@/lib/periods";

export default async function BenchmarksPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const session = await requireSchoolSession();
  const sp = await searchParams;
  const coachCtx = await resolveCoachClassContext(session, { classId: sp.classId });

  await prisma.activityCategory.upsert({
    where: { slug: "flexibility" },
    create: { slug: "flexibility", name: "Flexibility", sortOrder: 40 },
    update: {},
  });

  let coachProfileId: string | null = null;
  let activeSetId = "";
  let ownSets: KpiSetSummary[] = [];
  let publicSets: KpiSetSummary[] = [];

  try {
    const ctx = await ensureCoachActiveKpiSet(session.userId, session.schoolId);
    coachProfileId = ctx.coach.id;
    activeSetId = ctx.activeSet.id;
  } catch {
    const anyCoach = await prisma.coachProfile.findFirst({
      where: { schoolId: session.schoolId },
    });
    if (anyCoach) {
      const ctx = await ensureCoachActiveKpiSet(anyCoach.userId, session.schoolId);
      coachProfileId = ctx.coach.id;
      activeSetId = ctx.activeSet.id;
    }
  }

  const classScopedSetId = await resolveKpiSetForClassContext(
    session.schoolId,
    coachCtx.classId,
    coachCtx.subgroupId
  );
  if (classScopedSetId) {
    activeSetId = classScopedSetId;
  }

  if (coachProfileId) {
    const listed = await listKpiSetsForCoach({
      schoolId: session.schoolId,
      coachProfileId,
      includePublicFromOthers: true,
    });
    ownSets = listed.own as unknown as KpiSetSummary[];
    publicSets = listed.publicFromOthers as unknown as KpiSetSummary[];
    if (!activeSetId && ownSets[0]) activeSetId = ownSets[0].id;
  }

  const activeSet = ownSets.find((s) => s.id === activeSetId) ?? ownSets[0];

  const [customActivities, catalogActivities, hidden] = await Promise.all([
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

  const initial: TargetCell[] = (activeSet?.targets ?? [])
    .filter((r) => MEDALS.includes(r.medal as Medal) && !hiddenSet.has(r.metricSlug))
    .map((r) => ({
      gender: r.gender === "M" ? ("M" as const) : ("F" as const),
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
    ...customActivities
      .filter((a) => !hiddenSet.has(a.slug))
      .map((a) => ({
        slug: a.slug,
        name: a.name,
        unit: a.unit,
        categorySlug: a.category.slug,
        custom: true as const,
      })),
  ];

  const classLabel = coachCtx.classId
    ? classSectionLabel(
        coachCtx.classes.find((c) => c.id === coachCtx.classId) ?? {
          name: "Class",
          period: null,
        }
      )
    : null;

  return (
    <AppShell title="KPI targets" nav={COACH_NAV}>
      {classLabel ? (
        <p className="mb-4 text-sm text-muted">
          Editing KPI targets for <span className="font-medium text-foreground">{classLabel}</span>
          {coachCtx.subgroupId
            ? ` · ${coachCtx.subgroups.find((s) => s.id === coachCtx.subgroupId)?.name ?? "subgroup"}`
            : ""}
          . Change class in the header to switch packs when class-specific sets exist.
        </p>
      ) : null}
      <KpiTargetsEditor
        initial={initial}
        metrics={metrics}
        initialSets={ownSets}
        initialActiveSetId={activeSetId}
        publicSets={publicSets}
      />
      <div className="mt-8 max-w-2xl">
        <ImportMarksForm />
      </div>
    </AppShell>
  );
}
