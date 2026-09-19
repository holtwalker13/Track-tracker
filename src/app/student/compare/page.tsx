import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { STUDENT_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { getStudentContext } from "@/lib/queries/student";
import { getAthleteCompare, getAthleteLineup } from "@/lib/queries/compare";
import { AthleteDuel } from "@/components/compare/athlete-duel";
import { AthleteMultiPicker } from "@/components/compare/athlete-multi-picker";
import { AthleteLineup } from "@/components/compare/athlete-lineup";
import { CompareModeToggle, type CompareMode } from "@/components/compare/compare-mode-toggle";
import { genderFullLabel } from "@/lib/gender";
import { classYearLabel } from "@/lib/grades";
import { listStudents } from "@/lib/queries/coach";
import { prisma } from "@/lib/db";

export default async function StudentComparePage({
  searchParams,
}: {
  searchParams: Promise<{ vs?: string; ids?: string; student?: string; b?: string }>;
}) {
  const session = await requireSession(["STUDENT"]);
  if (!session?.studentId) redirect("/login");
  const sp = await searchParams;
  const mode: CompareMode =
    sp.vs === "peer" || sp.vs === "athlete" ? sp.vs : "benchmark";

  const { student, currentGrade } = await getStudentContext(session.studentId);
  const org = await prisma.organization.findFirst({
    where: { schools: { some: { id: student.schoolId } } },
    include: { settings: true },
  });
  const showNames = org?.settings?.showNamesOnLeaderboardsForStudents ?? false;

  const peers = await listStudents(student.schoolId, {
    grades: [currentGrade],
    gender: student.gender === "M" ? "M" : "F",
  });

  const pickerAthletes = peers.map((s) => ({
    id: s.id,
    name:
      s.id === session.studentId
        ? "You"
        : showNames && !s.anonymousToPeers
          ? s.name
          : `Student ${s.anonymousId ?? s.studentNumber}`,
    studentNumber: s.studentNumber,
    grade: s.grade,
  }));

  const fromIds = (sp.ids ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => peers.some((s) => s.id === id));

  // Always keep the viewing student in the lineup for athlete mode.
  let lineupIds =
    fromIds.length >= 2
      ? fromIds.slice(0, 5)
      : [session.studentId, sp.b].filter(
          (id): id is string => Boolean(id) && peers.some((s) => s.id === id)
        );

  if (mode === "athlete") {
    if (!lineupIds.includes(session.studentId)) {
      lineupIds = [session.studentId, ...lineupIds].slice(0, 5);
    }
    if (lineupIds.length < 2) {
      const other = peers.find((s) => s.id !== session.studentId);
      if (other) lineupIds = [session.studentId, other.id];
    }
  }

  const compare =
    mode !== "athlete"
      ? await getAthleteCompare(session.studentId, student.schoolId)
      : null;
  const lineup =
    mode === "athlete" && lineupIds.length >= 2
      ? await getAthleteLineup(lineupIds, student.schoolId, {
          anonymize: !showNames,
          viewerStudentId: session.studentId,
        })
      : null;

  const right =
    mode === "peer"
      ? { name: compare?.peerLabel ?? "Class avg", meta: "Same class & gender", isBenchmark: true as const }
      : { name: "Medal target", meta: "School Silver standard", isBenchmark: true as const };

  return (
    <AppShell title="Compare" nav={STUDENT_NAV}>
      <p className="mb-4 text-sm text-muted">
        Compare yourself to medal targets, class average, or classmates (names stay private unless
        your school turns them on).
      </p>
      <div className="mb-6">
        <CompareModeToggle allowAthlete athleteLabel="Classmates" />
      </div>

      {mode === "athlete" ? (
        <div className="mb-6">
          <AthleteMultiPicker athletes={pickerAthletes} selectedIds={lineupIds} />
        </div>
      ) : null}

      {mode === "athlete" && lineup ? (
        <AthleteLineup view={lineup} />
      ) : compare ? (
        <AthleteDuel
          left={{
            name: compare.student.name,
            meta: `${classYearLabel(currentGrade)} · ${genderFullLabel(student.gender)}`,
          }}
          right={right}
          events={compare.events}
          rightSource={mode === "peer" ? "peer" : "benchmark"}
        />
      ) : (
        <Card>
          <p className="text-sm text-muted">Not enough classmates to compare yet.</p>
        </Card>
      )}
    </AppShell>
  );
}
