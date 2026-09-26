import { AppShell } from "@/components/layout/app-shell";
import { WorkoutProgramsPanel } from "@/components/workouts/workout-programs-panel";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SchoolLiftsPanel } from "@/components/lifts/school-lifts-panel";
import { liftsForWorkoutPrograms, listSchoolLifts } from "@/lib/queries/lifts";
import { isGraduatingClassName } from "@/lib/periods";

export default async function CoachProgramsPage() {
  const session = await requireSchoolSession();

  const [templates, classes, schoolLifts] = await Promise.all([
    prisma.workoutTemplate.findMany({
      where: { schoolId: session.schoolId },
      orderBy: { updatedAt: "desc" },
      include: {
        exercises: {
          orderBy: { sortOrder: "asc" },
          include: { activity: { select: { slug: true, name: true } } },
        },
        _count: { select: { assignments: true } },
      },
    }),
    prisma.class.findMany({
      where: { schoolId: session.schoolId },
      orderBy: [{ period: "asc" }, { name: "asc" }],
      select: { id: true, name: true, period: true },
    }),
    listSchoolLifts(session.schoolId),
  ]);

  const workoutLifts = liftsForWorkoutPrograms(schoolLifts);

  const sectionClasses = classes.filter((c) => !isGraduatingClassName(c.name));

  return (
    <AppShell nav={COACH_NAV} title="Workout programs">
      <div className="mb-6">
        <SchoolLiftsPanel lifts={schoolLifts} />
      </div>
      <WorkoutProgramsPanel
        templates={templates.map((t) => ({
          ...t,
          updatedAt: t.updatedAt.toISOString(),
        }))}
        classes={sectionClasses}
        workoutLifts={workoutLifts}
      />
    </AppShell>
  );
}
