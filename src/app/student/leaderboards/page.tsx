import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { STUDENT_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { getStudentContext } from "@/lib/queries/student";
import { getStudentClassTags } from "@/lib/queries/kpi";
import { classYearLabel, gradesFromSearch, gradesLabel } from "@/lib/grades";
import { getLeaderboardGrid } from "@/lib/queries/leaderboard-grid";
import { LeaderboardGrid } from "@/components/leaderboards/leaderboard-grid";
import { RankScopeToggle } from "@/components/ui/rank-scope-toggle";
import { GradePills } from "@/components/ui/filter-pills";
import { ClassFilterPills } from "@/components/ui/class-filter-pills";
import { genderFullLabel } from "@/lib/gender";
import { prisma } from "@/lib/db";
import { classSectionLabel } from "@/lib/periods";

export default async function StudentLeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{
    scope?: string;
    grades?: string;
    grade?: string;
    classId?: string;
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

  let classLabel: string | null = null;
  if (classId) {
    const allowed = classTags.some((c) => c.id === classId);
    if (!allowed) {
      // Students may only filter to periods they share.
      redirect("/student/leaderboards");
    }
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
    classId
  );

  const peerNote = classLabel
    ? classLabel
    : gradesLabel(grades) === "all classes"
      ? "entire school"
      : gradesLabel(grades);

  return (
    <AppShell title="Leaderboards" nav={STUDENT_NAV}>
      <div className="mb-6 space-y-4">
        <p className="text-sm text-muted">
          Standing locked to {genderFullLabel(student.gender).toLowerCase()}. Filter by graduation year
          or a PE / weights period you share — classmates across grades in that section appear together.
        </p>
        <ClassFilterPills classes={classTags} />
        <GradePills />
        <RankScopeToggle />
      </div>
      <LeaderboardGrid
        boards={boards}
        subtitle={`${scope === "global" ? "Global" : "School"} · ${peerNote} · ${genderFullLabel(student.gender).toLowerCase()} · you: ${classYearLabel(currentGrade)}`}
        selfHref="/student"
        rankScope={scope}
        compareHref="/student/compare"
      />
    </AppShell>
  );
}
