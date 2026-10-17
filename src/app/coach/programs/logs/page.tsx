import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { WorkoutLogsPanel } from "@/components/workouts/workout-logs-panel";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { listWorkoutSessionsForCoach } from "@/lib/queries/workout-logs";
import { getClassWorkoutDayReview } from "@/lib/queries/workout-day-review";
import { WorkoutDayReview } from "@/components/workouts/workout-day-review";
import { todayDateString } from "@/lib/services/workouts";
import { isGraduatingClassName } from "@/lib/periods";
import { listClassSubgroups } from "@/lib/queries/class-subgroups";
import { TemporaryStudentsPanel } from "@/components/workouts/temporary-students-panel";

export default async function CoachWorkoutLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; classId?: string; subgroupId?: string }>;
}) {
  const session = await requireSchoolSession();
  const sp = await searchParams;
  const date = sp.date?.trim() || todayDateString();
  const classId = sp.classId?.trim() ?? "";
  const subgroupId = sp.subgroupId?.trim() ?? "";

  const classes = await prisma.class.findMany({
    where: { schoolId: session.schoolId },
    orderBy: [{ period: "asc" }, { name: "asc" }],
    select: { id: true, name: true, period: true },
  });
  const sectionClasses = classes.filter((c) => !isGraduatingClassName(c.name));

  const subgroups = classId ? await listClassSubgroups(classId) : [];

  const rows = await listWorkoutSessionsForCoach({
    schoolId: session.schoolId,
    dateStr: date,
    classId: classId || undefined,
    subgroupId: subgroupId || undefined,
  });
  const dayReview = classId
    ? await getClassWorkoutDayReview({
        schoolId: session.schoolId,
        classId,
        date,
        subgroupId: subgroupId || undefined,
      })
    : null;

  const provisionalStudents = classId
    ? await prisma.studentProfile.findMany({
        where: {
          schoolId: session.schoolId,
          provisional: true,
          classEnrollments: { some: { classId } },
        },
        select: { id: true, firstName: true, lastName: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      })
    : [];

  return (
    <AppShell nav={COACH_NAV} title="Workout logs" navCompact mobileCoachChrome>
      <p className="mb-4 text-sm">
        <Link href="/coach/programs" className="text-accent hover:underline">
          ← Programs
        </Link>
      </p>
      {classId ? (
        <div className="mb-4">
          <TemporaryStudentsPanel classId={classId} date={date} students={provisionalStudents} />
        </div>
      ) : null}
      {dayReview ? (
        <div className="mb-6">
          <WorkoutDayReview review={dayReview} />
        </div>
      ) : null}
      <h2 className="mb-2 text-sm font-semibold">Individual logs</h2>
      <WorkoutLogsPanel
        rows={rows}
        date={date}
        classId={classId}
        subgroupId={subgroupId}
        subgroups={subgroups}
        classes={sectionClasses}
      />
    </AppShell>
  );
}
