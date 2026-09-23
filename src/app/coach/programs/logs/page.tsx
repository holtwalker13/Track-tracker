import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { WorkoutLogsPanel } from "@/components/workouts/workout-logs-panel";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { listWorkoutSessionsForCoach } from "@/lib/queries/workout-logs";
import { todayDateString } from "@/lib/services/workouts";
import { isGraduatingClassName } from "@/lib/periods";

export default async function CoachWorkoutLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; classId?: string }>;
}) {
  const session = await requireSchoolSession();
  const sp = await searchParams;
  const date = sp.date?.trim() || todayDateString();
  const classId = sp.classId?.trim() ?? "";

  const classes = await prisma.class.findMany({
    where: { schoolId: session.schoolId },
    orderBy: [{ period: "asc" }, { name: "asc" }],
    select: { id: true, name: true, period: true },
  });
  const sectionClasses = classes.filter((c) => !isGraduatingClassName(c.name));

  const rows = await listWorkoutSessionsForCoach({
    schoolId: session.schoolId,
    dateStr: date,
    classId: classId || undefined,
  });

  return (
    <AppShell nav={COACH_NAV} title="Workout logs">
      <p className="mb-4 text-sm">
        <Link href="/coach/programs" className="text-accent hover:underline">
          ← Programs
        </Link>
      </p>
      <WorkoutLogsPanel
        rows={rows}
        date={date}
        classId={classId}
        classes={sectionClasses}
      />
    </AppShell>
  );
}
