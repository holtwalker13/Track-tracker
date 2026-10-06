import { AppShell } from "@/components/layout/app-shell";
import { CoachClassScopeBar } from "@/components/coach/coach-class-scope-bar";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { KpiTargetsEditor, type TargetCell, type KpiSetSummary } from "@/components/kpi/kpi-targets-editor";
import { ImportMarksForm } from "@/components/kpi/import-marks-form";
import { MEDALS, type Medal } from "@/lib/kpi-targets";
import { listSchoolKpiLibrary } from "@/lib/queries/kpi-library";
import { DEFAULT_AGE_BRACKET } from "@/lib/age-brackets";
import {
  ensureCoachActiveKpiSet,
  ensureKpiSetForClassScope,
  getKpiSetById,
  listKpiSetsForCoach,
  type KpiSetWithDetails,
} from "@/lib/services/kpi-sets";
import { classSectionLabel } from "@/lib/periods";
import { resolveCoachClassScopeFromParams } from "@/lib/queries/coach-scope-params";

export default async function BenchmarksPage({
  searchParams,
}: {
  searchParams: Promise<{ coachId?: string; classId?: string; subgroupId?: string }>;
}) {
  const session = await requireSchoolSession();
  const sp = await searchParams;
  const scope = await resolveCoachClassScopeFromParams(session, sp);

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

  const classRow = scope.classes.find((c) => c.id === scope.classId);
  const subgroupName =
    scope.subgroupId != null
      ? scope.subgroups.find((s) => s.id === scope.subgroupId)?.name ?? null
      : null;

  let scopedSet: KpiSetWithDetails | null = null;
  if (coachProfileId && scope.classId && classRow) {
    scopedSet = await ensureKpiSetForClassScope(
      session.schoolId,
      coachProfileId,
      scope.classId,
      scope.subgroupId,
      {
        className: classRow.name,
        subgroupName,
      }
    );
    if (scopedSet) {
      activeSetId = scopedSet.id;
    }
  }

  if (coachProfileId) {
    const listed = await listKpiSetsForCoach({
      schoolId: session.schoolId,
      coachProfileId,
      includePublicFromOthers: true,
    });
    ownSets = listed.own as unknown as KpiSetSummary[];
    publicSets = listed.publicFromOthers as unknown as KpiSetSummary[];
    if (scopedSet && !ownSets.some((s) => s.id === scopedSet!.id)) {
      ownSets = [scopedSet as unknown as KpiSetSummary, ...ownSets];
    }
    if (!activeSetId && ownSets[0]) activeSetId = ownSets[0].id;
  }

  if (
    activeSetId &&
    !ownSets.some((s) => s.id === activeSetId) &&
    !(scopedSet && scopedSet.id === activeSetId)
  ) {
    const fetched = await getKpiSetById(activeSetId);
    if (fetched) {
      ownSets = [fetched as unknown as KpiSetSummary, ...ownSets];
    }
  }

  const resolvedActiveSet =
    ownSets.find((s) => s.id === activeSetId) ??
    (scopedSet as unknown as KpiSetSummary | undefined) ??
    ownSets[0];

  // The KPI tab offers the school's full KPI library: every testing metric
  // (speed, power, agility, …) plus the workout-program lift library and any
  // coach-built customs — so targets can be set for anything athletes train
  // or test. Hidden KPIs/lifts stay out.
  const [kpiLibrary, hidden] = await Promise.all([
    listSchoolKpiLibrary(session.schoolId),
    prisma.schoolHiddenKpi.findMany({
      where: { schoolId: session.schoolId },
      select: { metricSlug: true },
    }),
  ]);

  const hiddenSet = new Set(hidden.map((h) => h.metricSlug));

  const initial: TargetCell[] = (resolvedActiveSet?.targets ?? [])
    .filter((r) => MEDALS.includes(r.medal as Medal) && !hiddenSet.has(r.metricSlug))
    .map((r) => ({
      gender: r.gender === "M" ? ("M" as const) : ("F" as const),
      medal: r.medal as Medal,
      metricSlug: r.metricSlug,
      target: r.target,
      ageBracket: r.ageBracket || DEFAULT_AGE_BRACKET,
    }));

  const metrics = kpiLibrary.map((a) => ({
    slug: a.slug,
    name: a.name,
    unit: a.unit,
    categorySlug: a.categorySlug,
    custom: a.custom,
  }));

  const scopeLabel = classRow
    ? `${classSectionLabel(classRow)}${subgroupName ? ` · ${subgroupName}` : ""}`
    : null;

  return (
    <AppShell title="KPI targets" nav={COACH_NAV}>
      <div className="mb-4">
        <CoachClassScopeBar
          coaches={scope.coaches}
          classes={scope.classes}
          subgroups={scope.subgroups}
          coachId={scope.coachId}
          classId={scope.classId}
          subgroupId={scope.subgroupId ?? ""}
          showCoach={session.role === "ADMIN"}
          showSubgroup
        />
      </div>
      {scopeLabel ? (
        <p className="mb-4 text-sm text-muted">
          Medal targets and ranked KPIs for{" "}
          <span className="font-medium text-foreground">{scopeLabel}</span>. Change class or
          subgroup above to edit a different group.
        </p>
      ) : (
        <p className="mb-4 text-sm text-muted">Select a class to configure KPI targets.</p>
      )}
      <KpiTargetsEditor
        key={`${scope.classId ?? "none"}-${scope.subgroupId ?? "class"}`}
        initial={initial}
        metrics={metrics}
        initialSets={ownSets}
        initialActiveSetId={activeSetId}
        publicSets={publicSets}
        classScopeMode={Boolean(scope.classId)}
        classScopeLabel={scopeLabel}
      />
      <div className="mt-8 max-w-2xl">
        <ImportMarksForm />
      </div>
    </AppShell>
  );
}
