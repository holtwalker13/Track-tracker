import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { STUDENT_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { getStudentContext } from "@/lib/queries/student";
import { getStudentClassTags } from "@/lib/queries/kpi";
import { classYearLabel, gradesFromSearch, gradesLabel } from "@/lib/grades";
import { getLeaderboardGrid } from "@/lib/queries/leaderboard-grid";
import { LeaderboardToolbar } from "@/components/ui/leaderboard-toolbar";
import { LeaderboardGrid } from "@/components/leaderboards/leaderboard-grid";
import { parseGenderParam } from "@/lib/gender";
import { prisma } from "@/lib/db";
import { classSectionLabel } from "@/lib/periods";
import {
  parseLeaderboardPeriod,
  periodLabel,
} from "@/lib/leaderboard-periods";

export default async function StudentLeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{
    scope?: string;
    grades?: string;
    grade?: string;
    classId?: string;
    period?: string;
  }>;
}) {
  const session = await requireSession(["STUDENT"]);
  if (!session?.studentId) redirect("/login");

  const { student, currentGrade } = await getStudentContext(session.studentId);
  const sp = await searchParams;
  const scope = sp.scope === "global" ? "global" : "school";
  const grades = gradesFromSearch(sp);
  const classTags = await getStudentClassTags(session.studentId);
  const classId = sp.classId?.trim() || undefined;
  const period = parseLeaderboardPeriod(sp.period);

  let classLabel: string | null = null;
  if (classId) {
    const allowed = classTags.some((c) => c.id === classId);
    if (!allowed) redirect("/student/leaderboards");
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      select: { name: true, period: true },
    });
    classLabel = cls ? classSectionLabel(cls) : null;
  }

  const { boards } = await getLeaderboardGrid(
    student.schoolId,
    grades,
    student.gender ?? undefined,
    scope,
    {
      role: "STUDENT",
      studentId: session.studentId,
      schoolId: student.schoolId,
    },
    classId,
    period
  );

  const peerNote = classLabel
    ? classLabel
    : gradesLabel(grades) === "all classes"
      ? "entire school"
      : gradesLabel(grades);

  const lockedGender = parseGenderParam(student.gender);

  return (
    <AppShell title="Leaderboards" nav={STUDENT_NAV}>
      <LeaderboardToolbar classes={classTags} lockedGender={lockedGender} />
      <LeaderboardGrid
        boards={boards}
        subtitle={`${periodLabel(period)} · ${scope === "global" ? "Global" : "School"} · ${peerNote} · you: ${classYearLabel(currentGrade)}`}
        selfHref="/student"
        rankScope={scope}
        compareHref="/student/compare"
      />
    </AppShell>
  );
}
