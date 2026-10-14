import { Card } from "@/components/ui/card";
import { requireSchoolSession } from "@/lib/auth/session";
import { getAthleteLineup } from "@/lib/queries/compare";
import { AthleteMultiPicker } from "@/components/compare/athlete-multi-picker";
import { AthleteLineup } from "@/components/compare/athlete-lineup";
import { GradePills } from "@/components/ui/filter-pills";
import { GenderToggle } from "@/components/ui/gender-toggle";
import { gradesFromSearch } from "@/lib/grades";
import { parseGenderParam } from "@/lib/gender";
import { listStudents } from "@/lib/queries/coach";
import { CoachClassScopeBar } from "@/components/coach/coach-class-scope-bar";
import { resolveCoachClassScopeFromParams } from "@/lib/queries/coach-scope-params";
import { kpiScopeOptsFromClassBar } from "@/lib/services/kpi-sets";

export default async function CompeteComparePage({
  searchParams,
}: {
  searchParams: Promise<{
    student?: string;
    b?: string;
    ids?: string;
    q?: string;
    grade?: string;
    grades?: string;
    gender?: string;
    classId?: string;
    subgroupId?: string;
    coachId?: string;
  }>;
}) {
  const session = await requireSchoolSession();
  const sp = await searchParams;
  const scopeCtx = await resolveCoachClassScopeFromParams(session, {
    coachId: sp.coachId,
    classId: sp.classId,
    subgroupId: sp.subgroupId,
  });
  const kpiScope = kpiScopeOptsFromClassBar(scopeCtx.classId, scopeCtx.subgroupId);
  const grades = gradesFromSearch(sp);
  const gender = parseGenderParam(sp.gender);

  const rawStudents = await listStudents(session.schoolId, {
    grades,
    search: sp.q,
    gender,
  });

  const seen = new Set<string>();
  const students = rawStudents.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  const pickerAthletes = students.map((s) => ({
    id: s.id,
    name: s.name,
    studentNumber: s.studentNumber,
    grade: s.grade,
  }));

  const fromIds = (sp.ids ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => students.some((s) => s.id === id));

  const seedIds =
    fromIds.length >= 2
      ? fromIds.slice(0, 5)
      : [sp.student, sp.b].filter(
          (id): id is string => Boolean(id) && students.some((s) => s.id === id)
        );

  const selectedId = seedIds[0] ?? students[0]?.id;

  const filledLineup =
    seedIds.length >= 2
      ? seedIds
      : [selectedId, students.find((s) => s.id !== selectedId)?.id].filter(
          (id): id is string => Boolean(id)
        );

  const lineup =
    filledLineup.length >= 2
      ? await getAthleteLineup(filledLineup, session.schoolId, kpiScope)
      : null;

  return (
    <>
      <div className="mb-4">
        <CoachClassScopeBar
          coaches={scopeCtx.coaches}
          classes={scopeCtx.classes}
          subgroups={scopeCtx.subgroups}
          coachId={scopeCtx.coachId}
          classId={scopeCtx.classId}
          subgroupId={scopeCtx.subgroupId ?? ""}
          showCoach={session.role === "ADMIN"}
          showSubgroup
        />
      </div>

      <div className="mb-6 space-y-4">
        <GradePills />
        <GenderToggle />
      </div>

      <div className="mb-6">
        <AthleteMultiPicker athletes={pickerAthletes} selectedIds={filledLineup} />
      </div>

      {lineup ? (
        <AthleteLineup view={lineup} />
      ) : (
        <Card>
          <p className="text-sm text-muted">
            {students.length < 2
              ? "Need at least two athletes in this filter to compare side by side."
              : "Select two or more athletes above to compare season bests."}
          </p>
        </Card>
      )}
    </>
  );
}
