import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ProgramsScopeBar } from "@/components/workouts/programs-scope-bar";
import { ProgramsWeekCalendar } from "@/components/workouts/programs-week-calendar";
import { TemporaryStudentsPanel } from "@/components/workouts/temporary-students-panel";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { resolveCoachClassScopeFromParams } from "@/lib/queries/coach-scope-params";
import { prisma } from "@/lib/db";
import {
  dateRangeDays,
  listAssignmentsForClassRange,
  listClassesForCoach,
  listSchoolCoaches,
  listTestsForClassRange,
  weekStartSunday,
} from "@/lib/queries/programs-hub";
import { getClassWorkoutDayReview } from "@/lib/queries/workout-day-review";
import { getTestingDayReview } from "@/lib/queries/testing-log";
import { ProgramsDayReview } from "@/components/workouts/programs-day-review";
import { listClassSavedWorkouts } from "@/lib/queries/class-saved-workouts";
import { listAttendanceForClassRange } from "@/lib/queries/attendance";
import { listSchoolKpiLibrary } from "@/lib/queries/kpi-library";
import {
  ensureSchoolDefaultKpiSetId,
  getKpiSetMetricOrderingForClassScope,
} from "@/lib/services/kpi-sets";
import { todayDateString } from "@/lib/services/workouts";
import { classSectionLabel } from "@/lib/periods";

export default async function CoachProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{
    coachId?: string;
    classId?: string;
    subgroupId?: string;
    week?: string;
    weeks?: string;
    date?: string;
    assignment?: string;
    test?: string;
  }>;
}) {
  const session = await requireSchoolSession();
  const sp = await searchParams;
  const today = todayDateString();

  const scope = await resolveCoachClassScopeFromParams(session, {
    coachId: sp.coachId,
    classId: sp.classId,
    subgroupId: sp.subgroupId,
  });
  const { coachId, classId, subgroups, subgroupId } = scope;
  const coaches = await listSchoolCoaches(session.schoolId);
  const classes = coachId ? await listClassesForCoach(session.schoolId, coachId) : [];

  const weekStart = weekStartSunday(sp.week?.trim() || today);
  const weeks = Math.min(6, Math.max(1, Number(sp.weeks) || 1));
  const selectedDate = sp.date?.trim() || today;

  const rangeEnd = dateRangeDays(weekStart, weeks * 7).at(-1) ?? weekStart;

  const selectedAssignment = sp.assignment?.trim() || "";
  const selectedTest = sp.test?.trim() || "";

  const [templates, assignments, tests, dayReview, testReview, attendance, kpiLibrary] =
    await Promise.all([
    classId ? listClassSavedWorkouts(session.schoolId, classId) : Promise.resolve([]),
    classId
      ? listAssignmentsForClassRange({
          schoolId: session.schoolId,
          classId,
          startDate: weekStart,
          endDate: rangeEnd,
        })
      : Promise.resolve([]),
    classId
      ? listTestsForClassRange({
          schoolId: session.schoolId,
          classId,
          startDate: weekStart,
          endDate: rangeEnd,
        })
      : Promise.resolve([]),
    classId && selectedAssignment
      ? getClassWorkoutDayReview({
          schoolId: session.schoolId,
          classId,
          date: selectedDate,
          subgroupId: subgroupId ?? undefined,
          assignmentId: selectedAssignment,
        })
      : Promise.resolve(null),
    classId && selectedTest
      ? getTestingDayReview(session.schoolId, selectedTest, classId)
      : Promise.resolve(null),
    classId
      ? listAttendanceForClassRange({
          schoolId: session.schoolId,
          classId,
          startDate: weekStart,
          endDate: rangeEnd,
          subgroupId: subgroupId ?? undefined,
        })
      : Promise.resolve([]),
    listSchoolKpiLibrary(session.schoolId),
  ]);

  if (classId) await ensureSchoolDefaultKpiSetId(session.schoolId);
  const classMetricOrdering = classId
    ? await getKpiSetMetricOrderingForClassScope(session.schoolId, classId)
    : { ranked: [] as string[], unranked: [] as string[] };

  const selectedClass = classes.find((c) => c.id === classId) ?? null;
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
    <AppShell nav={COACH_NAV} title="Programs">
      <div className="space-y-5">
        <Suspense fallback={null}>
          <ProgramsScopeBar
            coaches={coaches}
            classes={classes}
            subgroups={subgroups}
            coachId={coachId}
            classId={classId}
            subgroupId={subgroupId ?? ""}
            trailing={
              classId ? (
                <TemporaryStudentsPanel
                  classId={classId}
                  date={selectedDate}
                  students={provisionalStudents}
                />
              ) : null
            }
          />
        </Suspense>

        {!classId ? (
          <p className="rounded-xl border border-dashed border-card-border px-4 py-8 text-center text-sm text-muted">
            {coaches.length === 0
              ? "No coaches at this school yet."
              : "This coach has no classes yet. Add a class under School → Classes."}
          </p>
        ) : (
          <Suspense fallback={null}>
            <ProgramsWeekCalendar
              weekStart={weekStart}
              weeks={weeks}
              assignments={assignments}
              selectedDate={selectedDate}
              classId={classId}
              classLabel={selectedClass ? classSectionLabel(selectedClass) : "Class"}
              subgroupId={subgroupId}
              subgroupName={subgroups.find((s) => s.id === subgroupId)?.name ?? null}
              templates={templates.map((t) => ({
                id: t.id,
                name: t.name,
                exercises: t.exercises,
              }))}
              tests={tests}
              attendance={attendance}
              testBuilder={{
                classes,
                kpiLibrary,
                metricsByClassId: { [classId]: classMetricOrdering },
              }}
            />
          </Suspense>
        )}

        {classId ? (
          <ProgramsDayReview
            workout={selectedTest ? null : dayReview}
            test={selectedAssignment ? null : testReview}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
