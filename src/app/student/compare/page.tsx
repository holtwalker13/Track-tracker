import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { STUDENT_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { getStudentContext } from "@/lib/queries/student";
import { getAthleteCompare } from "@/lib/queries/compare";
import { AthleteDuel } from "@/components/compare/athlete-duel";
import { CompareModeToggle, type CompareMode } from "@/components/compare/compare-mode-toggle";
import { genderFullLabel } from "@/lib/gender";
import { classYearLabel } from "@/lib/grades";

export default async function StudentComparePage({
  searchParams,
}: {
  searchParams: Promise<{ vs?: string }>;
}) {
  const session = await requireSession(["STUDENT"]);
  if (!session?.studentId) redirect("/login");
  const sp = await searchParams;
  const mode: CompareMode = sp.vs === "peer" ? "peer" : "benchmark";

  const { student, currentGrade } = await getStudentContext(session.studentId);
  const compare = await getAthleteCompare(session.studentId, student.schoolId);

  const right =
    mode === "peer"
      ? { name: compare.peerLabel, meta: "Same class & gender", isBenchmark: true as const }
      : { name: "Medal target", meta: "School Silver standard", isBenchmark: true as const };

  return (
    <AppShell title="Compare" nav={STUDENT_NAV}>
      <p className="mb-4 text-sm text-muted">
        Your marks vs your school’s Silver medal target — or switch to class and gender average.
      </p>
      <div className="mb-6">
        <CompareModeToggle allowAthlete={false} />
      </div>
      <AthleteDuel
        left={{
          name: compare.student.name,
          meta: `${classYearLabel(currentGrade)} · ${genderFullLabel(student.gender)}`,
        }}
        right={right}
        events={compare.events}
        rightSource={mode === "peer" ? "peer" : "benchmark"}
      />
    </AppShell>
  );
}
