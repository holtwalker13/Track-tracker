import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ProgramsScopeBar } from "@/components/workouts/programs-scope-bar";
import { ProgramsWeekCalendar } from "@/components/workouts/programs-week-calendar";
import { ProgramsActivityPanel } from "@/components/workouts/programs-activity-panel";
import { ProgramsActions } from "@/components/workouts/programs-actions";
import { ProgramsLiftPreview } from "@/components/workouts/programs-lift-preview";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { resolveCoachClassScopeFromParams } from "@/lib/queries/coach-scope-params";
import { prisma } from "@/lib/db";
import { liftsForWorkoutPrograms, listSchoolLifts } from "@/lib/queries/lifts";
import {
  dateRangeDays,
  listAssignmentsForClassRange,
  listClassesForCoach,
  listSchoolCoaches,
  weekStartSunday,
} from "@/lib/queries/programs-hub";
import { listWorkoutSessionsForCoachRange } from "@/lib/queries/workout-logs";
import { todayDateString } from "@/lib/services/workouts";
import { format, parseISO } from "date-fns";

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
    logView?: string;
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
  const logView = sp.logView === "week" ? "week" : "day";

  const rangeEnd = dateRangeDays(weekStart, weeks * 7).at(-1) ?? weekStart;

  const [templates, schoolLifts, assignments, dayLogs, weekLogs] = await Promise.all([
    prisma.workoutTemplate.findMany({
      where: {
        schoolId: session.schoolId,
        OR: [{ createdById: session.userId }, { createdById: null }],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        exercises: {
          orderBy: { sortOrder: "asc" },
          include: { activity: { select: { slug: true, name: true } } },
        },
        _count: { select: { assignments: true } },
      },
    }),
    listSchoolLifts(session.schoolId),
    classId
      ? listAssignmentsForClassRange({
          schoolId: session.schoolId,
          classId,
          startDate: weekStart,
          endDate: rangeEnd,
        })
      : Promise.resolve([]),
    classId
      ? listWorkoutSessionsForCoachRange({
          schoolId: session.schoolId,
          startDate: selectedDate,
          endDate: selectedDate,
          classId,
          subgroupId: subgroupId ?? undefined,
        })
      : Promise.resolve([]),
    classId
      ? listWorkoutSessionsForCoachRange({
          schoolId: session.schoolId,
          startDate: weekStart,
          endDate: dateRangeDays(weekStart, 7).at(-1) ?? weekStart,
          classId,
          subgroupId: subgroupId ?? undefined,
        })
      : Promise.resolve([]),
  ]);

  const workoutLifts = liftsForWorkoutPrograms(schoolLifts);
  const selectedClass = classes.find((c) => c.id === classId) ?? null;
  const activityRows = logView === "week" ? weekLogs : dayLogs;
  const weekLabel = `${format(parseISO(weekStart), "MMM d")} – ${format(
    parseISO(dateRangeDays(weekStart, 7).at(-1) ?? weekStart),
    "MMM d"
  )}`;

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
          />
        </Suspense>

        {!classId ? (
          <p className="rounded-xl border border-dashed border-card-border px-4 py-8 text-center text-sm text-muted">
            {coaches.length === 0
              ? "No coaches at this school yet."
              : "This coach has no classes yet. Add a class under School → Classes."}
          </p>
        ) : (
          <div className="grid gap-4 xl:grid-cols-5">
            <div className="xl:col-span-3">
              <Suspense fallback={null}>
                <ProgramsWeekCalendar
                  weekStart={weekStart}
                  weeks={weeks}
                  assignments={assignments}
                  selectedDate={selectedDate}
                  classId={classId}
                  subgroupId={subgroupId}
                  subgroupName={subgroups.find((s) => s.id === subgroupId)?.name ?? null}
                  templates={templates.map((t) => ({ id: t.id, name: t.name }))}
                />
              </Suspense>
            </div>
            <div className="xl:col-span-2 xl:min-h-[22rem]">
              <Suspense fallback={null}>
                <ProgramsActivityPanel
                  rows={activityRows}
                  date={selectedDate}
                  logView={logView}
                  weekLabel={weekLabel}
                />
              </Suspense>
            </div>
          </div>
        )}

        <ProgramsActions
          templates={templates.map((t) => ({
            ...t,
            updatedAt: t.updatedAt.toISOString(),
          }))}
          selectedClass={selectedClass}
          selectedSubgroupId={subgroupId}
          selectedSubgroupName={subgroups.find((s) => s.id === subgroupId)?.name ?? null}
          selectedDate={selectedDate}
          workoutLifts={workoutLifts}
        />

        <ProgramsLiftPreview lifts={schoolLifts} />
      </div>
    </AppShell>
  );
}
