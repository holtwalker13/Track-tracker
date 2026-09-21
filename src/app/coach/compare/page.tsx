import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { getAthleteCompare, getAthleteLineup } from "@/lib/queries/compare";
import { AthleteDuel } from "@/components/compare/athlete-duel";
import { AthletePicker } from "@/components/compare/athlete-picker";
import { AthleteMultiPicker } from "@/components/compare/athlete-multi-picker";
import { AthleteLineup } from "@/components/compare/athlete-lineup";
import { CompareModeToggle, type CompareMode } from "@/components/compare/compare-mode-toggle";
import { GradePills } from "@/components/ui/filter-pills";
import { GenderToggle } from "@/components/ui/gender-toggle";
import { classYearLabel, gradesFromSearch } from "@/lib/grades";
import { parseGenderParam, genderFullLabel } from "@/lib/gender";
import { listStudents } from "@/lib/queries/coach";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{
    student?: string;
    b?: string;
    ids?: string;
    vs?: string;
    q?: string;
    grade?: string;
    grades?: string;
    gender?: string;
  }>;
}) {
  const session = await requireSchoolSession();
  const sp = await searchParams;
  const grades = gradesFromSearch(sp);
  const gender = parseGenderParam(sp.gender);
  const mode: CompareMode =
    sp.vs === "peer" || sp.vs === "athlete" ? sp.vs : "benchmark";

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

  const lineupIds =
    fromIds.length >= 2
      ? fromIds.slice(0, 5)
      : [sp.student, sp.b].filter((id): id is string => Boolean(id) && students.some((s) => s.id === id));

  const selectedId =
    mode === "athlete"
      ? lineupIds[0] ?? students[0]?.id
      : sp.student && students.some((s) => s.id === sp.student)
        ? sp.student
        : students[0]?.id;

  const filledLineup =
    lineupIds.length >= 2
      ? lineupIds
      : [selectedId, students.find((s) => s.id !== selectedId)?.id].filter(
          (id): id is string => Boolean(id)
        );

  const compare =
    mode !== "athlete" && selectedId
      ? await getAthleteCompare(selectedId, session.schoolId)
      : null;
  const lineup =
    mode === "athlete" && filledLineup.length >= 2
      ? await getAthleteLineup(filledLineup, session.schoolId)
      : null;

  const right =
    mode === "peer"
      ? {
          name: compare?.peerLabel ?? "Class avg",
          meta: "Same class & gender",
          isBenchmark: true,
        }
      : {
          name: "Medal target",
          meta: "School Silver standard",
          isBenchmark: true,
        };

  return (
    <AppShell title="Compare" nav={COACH_NAV}>
      <p className="mb-4 text-sm text-muted">
        Line up 2–5 athletes side by side, or stack one athlete against class average or your
        school’s Silver medal target.
      </p>

      <div className="mb-6 space-y-4">
        <GradePills />
        <GenderToggle />
        <CompareModeToggle allowAthlete />
      </div>

      {mode === "athlete" ? (
        <div className="mb-6">
          <AthleteMultiPicker athletes={pickerAthletes} selectedIds={filledLineup} />
        </div>
      ) : (
        <div className="mb-6">
          <AthletePicker
            label="Athlete"
            athletes={pickerAthletes}
            selectedId={selectedId}
            param="student"
            accent="sky"
          />
        </div>
      )}

      {mode === "athlete" && lineup ? (
        <AthleteLineup view={lineup} />
      ) : compare && selectedId ? (
        <AthleteDuel
          left={{
            name: compare.student.name,
            meta: `${classYearLabel(compare.student.grade)} · ${genderFullLabel(compare.student.gender)}`,
          }}
          right={right}
          events={compare.events}
          rightSource={mode === "peer" ? "peer" : "benchmark"}
        />
      ) : (
        <Card>
          <p className="text-sm text-muted">No athletes in this filter.</p>
        </Card>
      )}
    </AppShell>
  );
}
