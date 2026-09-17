import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { getAthleteCompare } from "@/lib/queries/compare";
import { AthleteDuel } from "@/components/compare/athlete-duel";
import { AthletePicker } from "@/components/compare/athlete-picker";
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
    vs?: string;
    q?: string;
    grade?: string;
    grades?: string;
    gender?: string;
  }>;
}) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) redirect("/login");
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

  // One entry per athlete — seed can produce identical names.
  const seen = new Set<string>();
  const students = rawStudents.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  const selectedId = sp.student && students.some((s) => s.id === sp.student)
    ? sp.student
    : students[0]?.id;
  const selected = students.find((s) => s.id === selectedId);

  const opponentCandidates = students.filter((s) => s.id !== selectedId);
  const opponentId =
    mode === "athlete"
      ? sp.b && opponentCandidates.some((s) => s.id === sp.b)
        ? sp.b
        : opponentCandidates[0]?.id
      : undefined;

  const compare = selected
    ? await getAthleteCompare(selected.id, session.schoolId, opponentId)
    : null;

  const pickerAthletes = students.map((s) => ({
    id: s.id,
    name: s.name,
    studentNumber: s.studentNumber,
    grade: s.grade,
  }));

  const right =
    mode === "athlete" && compare?.opponent
      ? {
          name: compare.opponent.name,
          meta: `${classYearLabel(compare.opponent.grade)} · ${genderFullLabel(compare.opponent.gender)}`,
        }
      : mode === "peer"
        ? {
            name: compare?.peerLabel ?? "Class avg",
            meta: "Same class & gender",
            isBenchmark: true,
          }
        : {
            name: "KPI target",
            meta: "100m / 40yd potential band",
            isBenchmark: true,
          };

  return (
    <AppShell title="Compare" nav={COACH_NAV}>
      <p className="mb-4 text-sm text-muted">
        One athlete vs the mid KPI band by default — or flip to class average or another athlete.
      </p>

      <div className="mb-6 space-y-4">
        <GradePills />
        <GenderToggle />
        <CompareModeToggle allowAthlete />
      </div>

      <div className="mb-6 space-y-5">
        <AthletePicker
          label="Athlete"
          athletes={pickerAthletes}
          selectedId={selectedId}
          param="student"
          accent="sky"
        />
        {mode === "athlete" && (
          <AthletePicker
            label="Opponent"
            athletes={pickerAthletes}
            selectedId={opponentId}
            excludeIds={selectedId ? [selectedId] : []}
            param="b"
            accent="amber"
          />
        )}
      </div>

      {compare ? (
        <AthleteDuel
          left={{
            name: compare.student.name,
            meta: `${classYearLabel(compare.student.grade)} · ${genderFullLabel(compare.student.gender)}`,
          }}
          right={right}
          events={compare.events}
          rightSource={mode === "athlete" ? "athlete" : mode === "peer" ? "peer" : "benchmark"}
        />
      ) : (
        <Card>
          <p className="text-sm text-muted">No athletes in this filter.</p>
        </Card>
      )}
    </AppShell>
  );
}
