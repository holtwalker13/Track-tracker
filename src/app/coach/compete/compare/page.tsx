import { requireSchoolSession } from "@/lib/auth/session";
import { getAthleteLineup } from "@/lib/queries/compare";
import { getLeaderboardGrid } from "@/lib/queries/leaderboard-grid";
import { resolveCoachClassScopeFromParams } from "@/lib/queries/coach-scope-params";
import { kpiScopeOptsFromClassBar } from "@/lib/services/kpi-sets";
import { gradesFromSearch } from "@/lib/grades";
import { parseGenderParam } from "@/lib/gender";
import { parseLeaderboardPeriod } from "@/lib/leaderboard-periods";
import { CompeteCompareView } from "@/components/compete/compete-compare-view";

export default async function CompeteComparePage({
  searchParams,
}: {
  searchParams: Promise<{
    ids?: string;
    grade?: string;
    grades?: string;
    gender?: string;
    scope?: string;
    classId?: string;
    subgroupId?: string;
    coachId?: string;
    period?: string;
    event?: string;
  }>;
}) {
  const session = await requireSchoolSession();
  const sp = await searchParams;
  const allClasses = sp.classId === "all";
  const scopeCtx = await resolveCoachClassScopeFromParams(session, {
    coachId: sp.coachId,
    classId: allClasses ? undefined : sp.classId,
    subgroupId: sp.subgroupId,
  });
  const kpiScope = kpiScopeOptsFromClassBar(
    allClasses ? "" : scopeCtx.classId,
    scopeCtx.subgroupId
  );
  const grades = gradesFromSearch(sp);
  const gender = parseGenderParam(sp.gender);
  const scope = sp.scope === "global" ? "global" : "school";
  const classId = allClasses ? undefined : scopeCtx.classId || undefined;
  const period = parseLeaderboardPeriod(sp.period);

  const { boards } = await getLeaderboardGrid(
    session.schoolId,
    grades,
    gender,
    scope,
    {
      role: session.role,
      schoolId: session.schoolId,
      studentId: session.studentId,
    },
    classId,
    period,
    undefined,
    allClasses ? null : scopeCtx.subgroupId
  );

  const eventSlug = sp.event?.trim() || boards[0]?.activity.slug;
  const board =
    boards.find((b) => b.activity.slug === eventSlug) ?? boards[0] ?? null;
  const rosterIds = new Set(board?.entries.map((e) => e.studentId) ?? []);

  const selectedIds = (sp.ids ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => rosterIds.has(id))
    .slice(0, 2);

  const lineup =
    selectedIds.length >= 2
      ? await getAthleteLineup(selectedIds, session.schoolId, kpiScope)
      : null;

  const leaderboardQs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (key === "ids" || value == null) continue;
    leaderboardQs.set(key, value);
  }
  const leaderboardHref = leaderboardQs.toString()
    ? `/coach/compete/leaderboards?${leaderboardQs}`
    : "/coach/compete/leaderboards";

  return (
    <CompeteCompareView
      boards={boards}
      lineup={lineup}
      defaultCoachId={scopeCtx.coachId}
      defaultClassId={allClasses ? "all" : scopeCtx.classId}
      defaultSubgroupId={scopeCtx.subgroupId}
      leaderboardHref={leaderboardHref}
    />
  );
}
