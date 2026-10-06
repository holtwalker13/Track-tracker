import { prisma } from "@/lib/db";
import {
  ALL_KPI_BANDS,
  KPI_METRIC_META,
  MEDALS,
  MEDAL_LABELS,
  type KpiBand,
  type KpiMetricSlug,
  type Medal,
} from "@/lib/kpi-targets";
import { DEFAULT_AGE_BRACKET, isAgeBracketId } from "@/lib/age-brackets";
import { isCoachingSportId, sportLabel } from "@/lib/sports";
import { ensureSchoolKpiTargets } from "@/lib/queries/kpi";
import { listSchoolKpiLibrary } from "@/lib/queries/kpi-library";

export type KpiSetTargetCell = {
  gender: "F" | "M";
  medal: Medal;
  metricSlug: string;
  /** null / omit = blank (unranked medal slot) */
  target: number | null;
  ageBracket: string;
};

export type KpiSetMetricState = {
  metricSlug: string;
  ranked: boolean;
  sortOrder?: number;
};

const setInclude = {
  metrics: { orderBy: [{ ranked: "desc" as const }, { sortOrder: "asc" as const }, { metricSlug: "asc" as const }] },
  targets: true,
  coach: {
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  },
};

export type KpiSetWithDetails = Awaited<ReturnType<typeof getKpiSetById>>;

async function resolveCoachProfile(userId: string, schoolId: string) {
  const profile = await prisma.coachProfile.findFirst({
    where: { userId, schoolId },
  });
  return profile;
}

/** Migrate legacy SchoolKpiTarget rows into a default KPI set for the school. */
export async function ensureDefaultKpiSet(schoolId: string, coachProfileId: string) {
  await ensureSchoolKpiTargets(schoolId);

  const existingDefault = await prisma.kpiSet.findFirst({
    where: { schoolId, isDefault: true, classId: null, subgroupId: null },
    include: setInclude,
  });
  if (existingDefault) return existingDefault;

  // A class/subgroup-scoped set must never double as the school-wide default:
  // clear stale flags so scoped sets stay scoped to their class.
  await prisma.kpiSet.updateMany({
    where: {
      schoolId,
      isDefault: true,
      OR: [{ classId: { not: null } }, { subgroupId: { not: null } }],
    },
    data: { isDefault: false },
  });

  const anySet = await prisma.kpiSet.findFirst({
    where: { schoolId, classId: null, subgroupId: null },
    include: setInclude,
    orderBy: { createdAt: "asc" },
  });
  if (anySet) {
    return prisma.kpiSet.update({
      where: { id: anySet.id },
      data: { isDefault: true },
      include: setInclude,
    });
  }

  const schoolTargets = await prisma.schoolKpiTarget.findMany({ where: { schoolId } });
  const hidden = await prisma.schoolHiddenKpi.findMany({
    where: { schoolId },
    select: { metricSlug: true },
  });
  const hiddenSet = new Set(hidden.map((h) => h.metricSlug));

  // Full KPI library (testing metrics + workout lifts + customs), minus hidden.
  const librarySlugs = (await listSchoolKpiLibrary(schoolId)).map((a) => a.slug);

  const uniqueSlugs = [...new Set(librarySlugs)];

  const set = await prisma.kpiSet.create({
    data: {
      schoolId,
      coachProfileId,
      name: "School default",
      sport: "pe",
      description: "Migrated from school medal targets. Switch or duplicate for sport-specific packs.",
      isPublic: false,
      isDefault: true,
      metrics: {
        create: uniqueSlugs.map((metricSlug, index) => {
          const hasTarget = schoolTargets.some((t) => t.metricSlug === metricSlug);
          return {
            metricSlug,
            ranked: hasTarget,
            sortOrder: index,
          };
        }),
      },
      targets: {
        create: schoolTargets
          .filter((t) => !hiddenSet.has(t.metricSlug))
          .map((t) => ({
            gender: t.gender,
            medal: t.medal,
            metricSlug: t.metricSlug,
            target: t.target,
            ageBracket: t.ageBracket || DEFAULT_AGE_BRACKET,
          })),
      },
    },
    include: setInclude,
  });

  return set;
}

export async function ensureCoachActiveKpiSet(userId: string, schoolId: string) {
  let coach = await resolveCoachProfile(userId, schoolId);
  if (!coach) {
    // Admin impersonating a school may not have a CoachProfile — attach a transient default via first coach
    const anyCoach = await prisma.coachProfile.findFirst({ where: { schoolId } });
    if (!anyCoach) {
      throw new Error("No coach profile for this school");
    }
    const defaultSet = await ensureDefaultKpiSet(schoolId, anyCoach.id);
    return { coach: anyCoach, activeSet: defaultSet, isImpersonating: true as const };
  }

  const defaultSet = await ensureDefaultKpiSet(schoolId, coach.id);

  if (coach.activeKpiSetId) {
    const active = await prisma.kpiSet.findFirst({
      where: { id: coach.activeKpiSetId, schoolId },
      include: setInclude,
    });
    if (active) {
      return { coach, activeSet: active, isImpersonating: false as const };
    }
  }

  coach = await prisma.coachProfile.update({
    where: { id: coach.id },
    data: { activeKpiSetId: defaultSet.id },
  });

  return { coach, activeSet: defaultSet, isImpersonating: false as const };
}

export async function listKpiSetsForCoach(opts: {
  schoolId: string;
  coachProfileId: string;
  includePublicFromOthers?: boolean;
}) {
  const own = await prisma.kpiSet.findMany({
    where: { schoolId: opts.schoolId, coachProfileId: opts.coachProfileId },
    include: setInclude,
    orderBy: [{ sport: "asc" }, { name: "asc" }],
  });

  if (!opts.includePublicFromOthers) return { own, publicFromOthers: [] as typeof own };

  const publicFromOthers = await prisma.kpiSet.findMany({
    where: {
      isPublic: true,
      NOT: { coachProfileId: opts.coachProfileId },
    },
    include: setInclude,
    orderBy: [{ sport: "asc" }, { name: "asc" }],
  });

  return { own, publicFromOthers };
}

export async function getKpiSetById(id: string) {
  return prisma.kpiSet.findUnique({
    where: { id },
    include: setInclude,
  });
}

export async function createKpiSet(input: {
  schoolId: string;
  coachProfileId: string;
  name: string;
  sport: string;
  description?: string | null;
  isPublic?: boolean;
  /** Seed metrics from library (ranked by default). */
  metricSlugs?: string[];
  makeActive?: boolean;
}) {
  if (!isCoachingSportId(input.sport)) {
    throw new Error("Invalid sport");
  }
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");

  const hidden = await prisma.schoolHiddenKpi.findMany({
    where: { schoolId: input.schoolId },
    select: { metricSlug: true },
  });
  const hiddenSet = new Set(hidden.map((h) => h.metricSlug));

  let slugs = input.metricSlugs;
  if (!slugs?.length) {
    // New sets start from the full KPI library (testing metrics + workout
    // lifts + customs) so every school KPI is available to rank.
    slugs = (await listSchoolKpiLibrary(input.schoolId)).map((a) => a.slug);
  } else {
    slugs = slugs.filter((s) => !hiddenSet.has(s));
  }

  const set = await prisma.kpiSet.create({
    data: {
      schoolId: input.schoolId,
      coachProfileId: input.coachProfileId,
      name,
      sport: input.sport,
      description: input.description?.trim() || null,
      isPublic: Boolean(input.isPublic),
      metrics: {
        create: slugs.map((metricSlug, index) => ({
          metricSlug,
          // New sets start unranked until the coach sets medal targets
          ranked: false,
          sortOrder: index,
        })),
      },
    },
    include: setInclude,
  });

  if (input.makeActive) {
    await prisma.coachProfile.update({
      where: { id: input.coachProfileId },
      data: { activeKpiSetId: set.id },
    });
  }

  return set;
}

export async function updateKpiSetMeta(
  setId: string,
  coachProfileId: string,
  patch: {
    name?: string;
    sport?: string;
    description?: string | null;
    isPublic?: boolean;
  }
) {
  const existing = await prisma.kpiSet.findFirst({
    where: { id: setId, coachProfileId },
  });
  if (!existing) throw new Error("KPI set not found");

  if (patch.sport != null && !isCoachingSportId(patch.sport)) {
    throw new Error("Invalid sport");
  }

  return prisma.kpiSet.update({
    where: { id: setId },
    data: {
      ...(patch.name != null ? { name: patch.name.trim() } : {}),
      ...(patch.sport != null ? { sport: patch.sport } : {}),
      ...(patch.description !== undefined
        ? { description: patch.description?.trim() || null }
        : {}),
      ...(patch.isPublic != null ? { isPublic: patch.isPublic } : {}),
    },
    include: setInclude,
  });
}

export async function setCoachActiveKpiSet(
  coachProfileId: string,
  schoolId: string,
  kpiSetId: string
) {
  const set = await prisma.kpiSet.findFirst({
    where: {
      id: kpiSetId,
      OR: [
        { schoolId, coachProfileId },
        // Allow selecting own sets only for editing; active must be owned
        { id: kpiSetId, coachProfileId },
      ],
    },
  });
  if (!set || set.coachProfileId !== coachProfileId) {
    throw new Error("You can only activate your own KPI sets");
  }
  await prisma.coachProfile.update({
    where: { id: coachProfileId },
    data: { activeKpiSetId: kpiSetId },
  });
  return getKpiSetById(kpiSetId);
}

/**
 * Save medal targets + ranked flags for a set.
 * Blank targets (null) are deleted. Metrics with no medal values become unranked
 * unless an explicit ranked=true is passed with intent to fill later.
 */
export async function saveKpiSetTargets(
  setId: string,
  coachProfileId: string,
  input: {
    cells: KpiSetTargetCell[];
    metrics?: KpiSetMetricState[];
  }
) {
  const existing = await prisma.kpiSet.findFirst({
    where: { id: setId, coachProfileId },
    include: { metrics: true, targets: true },
  });
  if (!existing) throw new Error("KPI set not found");

  const knownSlugs = new Set<string>([
    ...KPI_METRIC_META.map((m) => m.slug),
    ...(
      await prisma.activity.findMany({
        where: { OR: [{ schoolId: existing.schoolId }, { schoolId: null }] },
        select: { slug: true },
      })
    ).map((a) => a.slug),
  ]);

  const metricState = new Map<string, { ranked: boolean; sortOrder: number }>();
  for (const m of existing.metrics) {
    metricState.set(m.metricSlug, { ranked: m.ranked, sortOrder: m.sortOrder });
  }
  if (input.metrics) {
    for (const m of input.metrics) {
      if (!knownSlugs.has(m.metricSlug)) continue;
      metricState.set(m.metricSlug, {
        ranked: m.ranked,
        sortOrder: m.sortOrder ?? metricState.get(m.metricSlug)?.sortOrder ?? 0,
      });
    }
  }

  // Normalize cells: only keep finite targets for known slugs
  const validCells = input.cells.filter((c) => {
    if (!knownSlugs.has(c.metricSlug)) return false;
    if (!MEDALS.includes(c.medal)) return false;
    if (c.gender !== "F" && c.gender !== "M") return false;
    if (!isAgeBracketId(String(c.ageBracket ?? ""))) return false;
    return true;
  });

  // Derive ranked from whether any medal target is set (unless explicit metrics override says ranked=false)
  const slugsWithTargets = new Set<string>();
  for (const c of validCells) {
    if (c.target != null && Number.isFinite(c.target)) {
      slugsWithTargets.add(c.metricSlug);
    }
  }

  for (const [slug, state] of metricState) {
    if (input.metrics?.some((m) => m.metricSlug === slug)) {
      // Trust explicit ranked from client
      continue;
    }
    // Auto: has targets => ranked; no targets => unranked
    state.ranked = slugsWithTargets.has(slug);
  }

  // Ensure metric rows exist for every cell slug
  for (const c of validCells) {
    if (!metricState.has(c.metricSlug)) {
      metricState.set(c.metricSlug, {
        ranked: slugsWithTargets.has(c.metricSlug),
        sortOrder: metricState.size,
      });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.kpiSetTarget.deleteMany({ where: { kpiSetId: setId } });

    const rows = validCells
      .filter((c) => c.target != null && Number.isFinite(c.target))
      .filter((c) => metricState.get(c.metricSlug)?.ranked !== false)
      .map((c) => ({
        kpiSetId: setId,
        gender: c.gender,
        medal: c.medal,
        metricSlug: c.metricSlug,
        target: c.target as number,
        ageBracket: c.ageBracket,
      }));

    if (rows.length) {
      await tx.kpiSetTarget.createMany({ data: rows });
    }

    for (const [metricSlug, state] of metricState) {
      await tx.kpiSetMetric.upsert({
        where: {
          kpiSetId_metricSlug: { kpiSetId: setId, metricSlug },
        },
        create: {
          kpiSetId: setId,
          metricSlug,
          ranked: state.ranked,
          sortOrder: state.sortOrder,
        },
        update: {
          ranked: state.ranked,
          sortOrder: state.sortOrder,
        },
      });
    }

    // Clear targets for explicitly unranked metrics
    const unrankedSlugs = [...metricState.entries()]
      .filter(([, s]) => !s.ranked)
      .map(([slug]) => slug);
    if (unrankedSlugs.length) {
      await tx.kpiSetTarget.deleteMany({
        where: { kpiSetId: setId, metricSlug: { in: unrankedSlugs } },
      });
    }

    await tx.kpiSet.update({
      where: { id: setId },
      data: { updatedAt: new Date() },
    });

    // Keep legacy SchoolKpiTarget in sync when this is the school default set
    if (existing.isDefault) {
      await syncSchoolTargetsFromSet(tx, existing.schoolId, setId);
    }
  });

  return getKpiSetById(setId);
}

async function syncSchoolTargetsFromSet(
  tx: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  schoolId: string,
  kpiSetId: string
) {
  const ranked = await tx.kpiSetMetric.findMany({
    where: { kpiSetId, ranked: true },
    select: { metricSlug: true },
  });
  const rankedSet = new Set(ranked.map((r) => r.metricSlug));
  const targets = await tx.kpiSetTarget.findMany({ where: { kpiSetId } });
  const rankedTargets = targets.filter((t) => rankedSet.has(t.metricSlug));

  await tx.schoolKpiTarget.deleteMany({ where: { schoolId } });
  if (rankedTargets.length) {
    await tx.schoolKpiTarget.createMany({
      data: rankedTargets.map((t) => ({
        schoolId,
        gender: t.gender,
        medal: t.medal,
        metricSlug: t.metricSlug,
        target: t.target,
        ageBracket: t.ageBracket,
      })),
    });
  }
}

export async function duplicateKpiSet(input: {
  sourceSetId: string;
  coachProfileId: string;
  schoolId: string;
  name: string;
  sport: string;
  description?: string | null;
  isPublic?: boolean;
  /** Optional override of medal targets while duplicating (does not touch source). */
  cells?: KpiSetTargetCell[];
  metrics?: KpiSetMetricState[];
  makeActive?: boolean;
}) {
  const source = await prisma.kpiSet.findFirst({
    where: {
      id: input.sourceSetId,
      OR: [{ isPublic: true }, { coachProfileId: input.coachProfileId }],
    },
    include: { metrics: true, targets: true },
  });
  if (!source) throw new Error("KPI set not found or not available to duplicate");
  if (!isCoachingSportId(input.sport)) throw new Error("Invalid sport");

  const name = input.name.trim();
  if (!name) throw new Error("Name is required");

  const metrics =
    input.metrics ??
    source.metrics.map((m) => ({
      metricSlug: m.metricSlug,
      ranked: m.ranked,
      sortOrder: m.sortOrder,
    }));

  const cells: KpiSetTargetCell[] =
    input.cells ??
    source.targets.map((t) => ({
      gender: t.gender === "M" ? "M" : "F",
      medal: t.medal as Medal,
      metricSlug: t.metricSlug,
      target: t.target,
      ageBracket: t.ageBracket || DEFAULT_AGE_BRACKET,
    }));

  const created = await prisma.kpiSet.create({
    data: {
      schoolId: input.schoolId,
      coachProfileId: input.coachProfileId,
      name,
      sport: input.sport,
      description:
        input.description?.trim() ||
        `Duplicated from ${source.name} (${sportLabel(source.sport)})`,
      isPublic: Boolean(input.isPublic),
      duplicatedFromId: source.id,
      metrics: {
        create: metrics.map((m, index) => ({
          metricSlug: m.metricSlug,
          ranked: m.ranked,
          sortOrder: m.sortOrder ?? index,
        })),
      },
    },
  });

  await saveKpiSetTargets(created.id, input.coachProfileId, { cells, metrics });

  if (input.makeActive) {
    await prisma.coachProfile.update({
      where: { id: input.coachProfileId },
      data: { activeKpiSetId: created.id },
    });
  }

  return getKpiSetById(created.id);
}

export async function deleteKpiSet(setId: string, coachProfileId: string) {
  const existing = await prisma.kpiSet.findFirst({
    where: { id: setId, coachProfileId },
  });
  if (!existing) throw new Error("KPI set not found");
  if (existing.isDefault) throw new Error("Cannot delete the school default KPI set");

  await prisma.$transaction(async (tx) => {
    await tx.coachProfile.updateMany({
      where: { activeKpiSetId: setId },
      data: { activeKpiSetId: null },
    });
    await tx.kpiSet.delete({ where: { id: setId } });
  });
}

/**
 * Build KpiBand[] from a KPI set (ranked metrics only). Targets are exactly
 * what the coach entered on the KPI tab — ranked KPIs without a target for a
 * medal stay unset instead of falling back to hardcoded defaults.
 */
export async function getKpiSetBands(
  kpiSetId: string,
  gender?: string | null,
  ageBracket: string = DEFAULT_AGE_BRACKET
): Promise<KpiBand[]> {
  const g: "F" | "M" = gender === "M" ? "M" : "F";
  const ranked = await prisma.kpiSetMetric.findMany({
    where: { kpiSetId, ranked: true },
    select: { metricSlug: true },
  });
  const rankedSlugs = new Set(ranked.map((r) => r.metricSlug));

  const rows = await prisma.kpiSetTarget.findMany({
    where: { kpiSetId, gender: g, ageBracket },
  });

  const byMedal = {
    gold: {} as Record<KpiMetricSlug, number>,
    silver: {} as Record<KpiMetricSlug, number>,
    bronze: {} as Record<KpiMetricSlug, number>,
  };
  for (const row of rows) {
    if (!rankedSlugs.has(row.metricSlug)) continue;
    if (row.medal !== "gold" && row.medal !== "silver" && row.medal !== "bronze") continue;
    byMedal[row.medal as Medal][row.metricSlug as KpiMetricSlug] = row.target;
  }
  return MEDALS.map((medal) => ({
    id: `${g}-${medal}`,
    gender: g,
    medal,
    label: g === "M" ? `Boys ${MEDAL_LABELS[medal]}` : `Girls ${MEDAL_LABELS[medal]}`,
    targets: byMedal[medal],
  }));
}

/**
 * Ranked KPI slugs for a class scope (medal standards, leaderboards, compare).
 * Resolution: subgroup set → class set → school default set (created on
 * demand so every view agrees). Only ranked KPIs are returned — exactly what
 * the KPI tab shows as ranked for that scope.
 */
export async function getRankedKpiSlugsForSchool(
  schoolId: string,
  classId?: string | null,
  subgroupId?: string | null
): Promise<string[]> {
  const setId = await resolveKpiSetForCompeteScope(schoolId, classId, subgroupId);
  if (setId) return getRankedMetricSlugs(setId);

  // No coach profile exists to own a default set — fall back to the catalog.
  return KPI_METRIC_META.map((m) => m.slug);
}

/** KPI set for Compete leaderboards & compare (class/subgroup → school default). */
export async function resolveKpiSetForCompeteScope(
  schoolId: string,
  classId?: string | null,
  subgroupId?: string | null
): Promise<string | null> {
  return (
    (await resolveKpiSetForClassScope(schoolId, classId ?? null, subgroupId ?? null)) ??
    (await ensureSchoolDefaultKpiSetId(schoolId))
  );
}

/** Ranked KPI slugs governing a specific athlete (their class/subgroup set context). */
export async function getRankedKpiSlugsForStudent(
  schoolId: string,
  studentId: string,
  opts: { classId?: string | null; subgroupId?: string | null } = {}
): Promise<string[]> {
  // When a medal class is explicitly selected, use the same class/subgroup scope
  // as getStudentSprintPotential / getAthleteMedalState — not the athlete's
  // subgroup override inside resolveKpiSetForStudentContext.
  if (opts.classId) {
    const enrolled = await prisma.classEnrollment.findFirst({
      where: { studentId, classId: opts.classId },
      select: { classId: true },
    });
    if (enrolled) {
      return getRankedKpiSlugsForSchool(
        schoolId,
        opts.classId,
        opts.subgroupId ?? null
      );
    }
  }
  const setId = await resolveKpiSetForStudentContext(schoolId, studentId, opts);
  if (setId) return getRankedMetricSlugs(setId);
  return getRankedKpiSlugsForSchool(schoolId, null, null);
}

/** Ranked metric slugs for a set (leaderboards / session builder ordering). */
export async function getRankedMetricSlugs(kpiSetId: string): Promise<string[]> {
  const rows = await prisma.kpiSetMetric.findMany({
    where: { kpiSetId, ranked: true },
    orderBy: [{ sortOrder: "asc" }, { metricSlug: "asc" }],
    select: { metricSlug: true },
  });
  return rows.map((r) => r.metricSlug);
}

/**
 * Ranked + unranked metric slugs of the KPI set governing a class scope, in
 * the set's configured order. Used to prioritize the testing-session builder:
 * the coach's ranked KPIs first, then the set's unranked KPIs.
 */
export async function getKpiSetMetricOrderingForClassScope(
  schoolId: string,
  classId: string
): Promise<{ ranked: string[]; unranked: string[] }> {
  const setId = await resolveKpiSetForClassScope(schoolId, classId, null);
  if (!setId) return { ranked: [], unranked: [] };
  const rows = await prisma.kpiSetMetric.findMany({
    where: { kpiSetId: setId },
    orderBy: [{ sortOrder: "asc" }, { metricSlug: "asc" }],
    select: { metricSlug: true, ranked: true },
  });
  return {
    ranked: rows.filter((r) => r.ranked).map((r) => r.metricSlug),
    unranked: rows.filter((r) => !r.ranked).map((r) => r.metricSlug),
  };
}

/** Ensure a KPI set exists for class or class+subgroup (auto-named from school entities). */
export async function ensureKpiSetForClassScope(
  schoolId: string,
  coachProfileId: string,
  classId: string,
  subgroupId?: string | null,
  labels?: { className: string; subgroupName?: string | null }
) {
  const name = labels?.subgroupName
    ? `${labels.className} · ${labels.subgroupName}`
    : labels?.className ?? "Class KPIs";

  // Only reuse a set scoped to this exact class/subgroup. The fallback chain in
  // resolveKpiSetForClassScope returns the school default set when no scoped set
  // exists — treating that as "existing" would make class edits overwrite the
  // school default and would never create the class set.
  const existing = await prisma.kpiSet.findFirst({
    where: { schoolId, classId, subgroupId: subgroupId ?? null },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (existing) {
    return getKpiSetById(existing.id);
  }

  // Seed the new scoped set from its parent scope so the values currently in
  // effect carry over: a subgroup set starts from the class set, a class set
  // from the school default. After creation the sets are fully independent.
  const parentId = subgroupId
    ? (
        await prisma.kpiSet.findFirst({
          where: { schoolId, classId, subgroupId: null },
          orderBy: { updatedAt: "desc" },
          select: { id: true },
        })
      )?.id ?? (await resolveSchoolKpiSetId(schoolId))
    : await resolveSchoolKpiSetId(schoolId);
  const parentSet = parentId ? await getKpiSetById(parentId) : null;

  const metrics =
    parentSet?.metrics.map((m) => ({
      metricSlug: m.metricSlug,
      ranked: m.ranked,
      sortOrder: m.sortOrder,
    })) ?? KPI_METRIC_META.map((m, i) => ({
      metricSlug: m.slug,
      ranked: true,
      sortOrder: i,
    }));

  const targets =
    parentSet?.targets.map((t) => ({
      gender: t.gender,
      medal: t.medal,
      metricSlug: t.metricSlug,
      target: t.target,
      ageBracket: t.ageBracket,
    })) ?? [];

  return prisma.kpiSet.create({
    data: {
      schoolId,
      coachProfileId,
      classId,
      subgroupId: subgroupId || null,
      name,
      sport: "pe",
      description: null,
      isPublic: false,
      isDefault: false,
      metrics: { create: metrics },
      targets: targets.length ? { create: targets } : undefined,
    },
    include: setInclude,
  });
}

/** Resolve KPI set for coach class context (subgroup-specific, then class, then school default). */
export async function resolveKpiSetForClassScope(
  schoolId: string,
  classId?: string | null,
  subgroupId?: string | null
): Promise<string | null> {
  if (subgroupId && classId) {
    const bySubgroup = await prisma.kpiSet.findFirst({
      where: { schoolId, classId, subgroupId },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (bySubgroup) return bySubgroup.id;
  }
  if (classId) {
    const byClass = await prisma.kpiSet.findFirst({
      where: { schoolId, classId, subgroupId: null },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (byClass) return byClass.id;
  }
  return resolveSchoolKpiSetId(schoolId);
}

/** @deprecated Alias — use resolveKpiSetForClassScope. */
export const resolveKpiSetForClassContext = resolveKpiSetForClassScope;

/**
 * Resolve the KPI set that governs a specific athlete: the set for the class the
 * athlete is actually enrolled in (subgroup set when the athlete belongs to a
 * subgroup that has one), falling back to the school default set.
 *
 * An explicit classId/subgroupId (e.g. from a coach scope bar) is honored only
 * when the athlete is actually enrolled in that class. Without an explicit scope
 * the most recently configured set among the athlete's own scopes wins —
 * subgroup sets (most specific) first, then class sets — so every view (coach
 * profile, student dashboard, compare) resolves the same set for the athlete.
 */
export async function resolveKpiSetForStudentContext(
  schoolId: string,
  studentId: string,
  opts: { classId?: string | null; subgroupId?: string | null } = {}
): Promise<string | null> {
  const enrollments = await prisma.classEnrollment.findMany({
    where: {
      studentId,
      class: { schoolId, NOT: { name: { startsWith: "Class of" } } },
    },
    select: { classId: true },
  });
  const enrolledClassIds = enrollments.map((e) => e.classId);
  if (enrolledClassIds.length === 0) return resolveSchoolKpiSetId(schoolId);

  const memberships = await prisma.classSubgroupMember.findMany({
    where: { studentId, subgroup: { classId: { in: enrolledClassIds } } },
    select: { subgroupId: true, subgroup: { select: { classId: true } } },
  });
  const memberSubgroupIds = memberships.map((m) => m.subgroupId);

  // Explicit scope only applies when the athlete belongs to it.
  const scopedClassId =
    opts.classId && enrolledClassIds.includes(opts.classId) ? opts.classId : null;
  if (scopedClassId) {
    const scopedSubgroupIds = memberships
      .filter((m) => m.subgroup.classId === scopedClassId)
      .map((m) => m.subgroupId);
    const subgroupCandidates =
      opts.subgroupId && scopedSubgroupIds.includes(opts.subgroupId)
        ? [opts.subgroupId, ...scopedSubgroupIds.filter((id) => id !== opts.subgroupId)]
        : scopedSubgroupIds;
    if (subgroupCandidates.length > 0) {
      const bySubgroup = await prisma.kpiSet.findFirst({
        where: { schoolId, classId: scopedClassId, subgroupId: { in: subgroupCandidates } },
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      });
      if (bySubgroup) return bySubgroup.id;
    }
    const byClass = await prisma.kpiSet.findFirst({
      where: { schoolId, classId: scopedClassId, subgroupId: null },
      select: { id: true },
    });
    if (byClass) return byClass.id;
  }

  // No explicit scope (or it has no set): the athlete's most recently
  // configured set governs — subgroup sets before class sets.
  if (memberSubgroupIds.length > 0) {
    const bySubgroup = await prisma.kpiSet.findFirst({
      where: { schoolId, subgroupId: { in: memberSubgroupIds } },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (bySubgroup) return bySubgroup.id;
  }
  const byClass = await prisma.kpiSet.findFirst({
    where: { schoolId, classId: { in: enrolledClassIds }, subgroupId: null },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (byClass) return byClass.id;

  return resolveSchoolKpiSetId(schoolId);
}

/** Resolve which set to use for a school (default), optionally matching sport. */
export async function resolveSchoolKpiSetId(
  schoolId: string,
  sport?: string | null
): Promise<string | null> {
  if (sport) {
    const bySport = await prisma.kpiSet.findFirst({
      where: { schoolId, sport, isPublic: true },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (bySport) return bySport.id;
    const anySport = await prisma.kpiSet.findFirst({
      where: { schoolId, sport },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (anySport) return anySport.id;
  }
  const def = await prisma.kpiSet.findFirst({
    where: { schoolId, isDefault: true, classId: null, subgroupId: null },
    select: { id: true },
  });
  return def?.id ?? null;
}

/**
 * Guarantee a school-wide default KPI set exists and return its id.
 * Returns null only when the school has no coach profile to own one.
 */
export async function ensureSchoolDefaultKpiSetId(schoolId: string): Promise<string | null> {
  const existing = await prisma.kpiSet.findFirst({
    where: { schoolId, isDefault: true, classId: null, subgroupId: null },
    select: { id: true },
  });
  if (existing) return existing.id;

  const anyCoach = await prisma.coachProfile.findFirst({
    where: { schoolId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!anyCoach) return null;
  const set = await ensureDefaultKpiSet(schoolId, anyCoach.id);
  return set.id;
}

/** Seed helper used when no SchoolKpiTarget rows exist yet. */
export function defaultTargetsFromCatalog() {
  return ALL_KPI_BANDS.flatMap((band) =>
    KPI_METRIC_META.map((meta) => ({
      gender: band.gender,
      medal: band.medal,
      metricSlug: meta.slug,
      target: band.targets[meta.slug],
      ageBracket: DEFAULT_AGE_BRACKET,
    }))
  );
}
