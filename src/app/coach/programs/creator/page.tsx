import { Suspense } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ProgramsScopeBar } from "@/components/workouts/programs-scope-bar";
import { ProgramsActions } from "@/components/workouts/programs-actions";
import { ProgramsLiftPreview } from "@/components/workouts/programs-lift-preview";
import { TestingLogNavLink } from "@/components/testing/testing-log-table";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { resolveCoachClassScopeFromParams } from "@/lib/queries/coach-scope-params";
import { liftsForWorkoutPrograms, listSchoolLifts } from "@/lib/queries/lifts";
import { prisma } from "@/lib/db";
import { listClassesForCoach, listSchoolCoaches } from "@/lib/queries/programs-hub";
import { listClassSavedWorkouts, savedWorkoutCreatorName } from "@/lib/queries/class-saved-workouts";
import { todayDateString } from "@/lib/services/workouts";

export default async function ProgramCreatorPage({
  searchParams,
}: {
  searchParams: Promise<{
    coachId?: string;
    classId?: string;
    subgroupId?: string;
    date?: string;
  }>;
}) {
  const session = await requireSchoolSession();
  const sp = await searchParams;
  const today = todayDateString();
  const school = await prisma.school.findUnique({
    where: { id: session.schoolId },
    select: { name: true },
  });

  const scope = await resolveCoachClassScopeFromParams(session, {
    coachId: sp.coachId,
    classId: sp.classId,
    subgroupId: sp.subgroupId,
  });
  const { coachId, classId, subgroups, subgroupId } = scope;
  const coaches = await listSchoolCoaches(session.schoolId);
  const classes = coachId ? await listClassesForCoach(session.schoolId, coachId) : [];
  const selectedDate = sp.date?.trim() || today;
  const selectedClass = classes.find((c) => c.id === classId) ?? null;

  const [templates, schoolLifts] = await Promise.all([
    classId ? listClassSavedWorkouts(session.schoolId, classId) : Promise.resolve([]),
    listSchoolLifts(session.schoolId),
  ]);
  const workoutLifts = liftsForWorkoutPrograms(schoolLifts);

  return (
    <AppShell nav={COACH_NAV} title="Program Creator" navCompact mobileCoachChrome>
      <div className="space-y-5">
        <p className="text-sm text-muted">
          Build saved workouts and browse the lift library. Schedule them from the{" "}
          <Link href="/coach/programs" className="text-accent hover:underline">
            calendar
          </Link>
          .
        </p>
        <Suspense fallback={null}>
          <ProgramsScopeBar
            coaches={coaches}
            classes={classes}
            subgroups={subgroups}
            coachId={coachId}
            classId={classId}
            subgroupId={subgroupId ?? ""}
            schoolName={school?.name ?? null}
          />
        </Suspense>

        {!classId ? (
          <p className="rounded-xl border border-dashed border-card-border px-4 py-8 text-center text-sm text-muted">
            {coaches.length === 0
              ? "No coaches at this school yet."
              : "This coach has no classes yet. Add a class under School → Classes."}
          </p>
        ) : (
          <>
            <div className="flex justify-end">
              <TestingLogNavLink classId={classId} />
            </div>
            <ProgramsActions
              templates={templates.map((t) => ({
                ...t,
                updatedAt: t.updatedAt.toISOString(),
                createdByName: savedWorkoutCreatorName(t.createdBy),
                canDelete: session.role === "ADMIN" || t.createdById === session.userId,
              }))}
              selectedClass={selectedClass}
              selectedSubgroupId={subgroupId}
              selectedSubgroupName={subgroups.find((s) => s.id === subgroupId)?.name ?? null}
              selectedDate={selectedDate}
              workoutLifts={workoutLifts}
            />
            <ProgramsLiftPreview lifts={schoolLifts} />
          </>
        )}
      </div>
    </AppShell>
  );
}
