import { AppShell } from "@/components/layout/app-shell";
import { WorkoutProgramsPanel } from "@/components/workouts/workout-programs-panel";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { LIFTING_WORKOUT_SLUGS } from "@/lib/lifting";
import { isGraduatingClassName } from "@/lib/periods";

export default async function CoachProgramsPage() {
  const session = await requireSchoolSession();

  const [templates, classes, activities] = await Promise.all([
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
    prisma.activity.findMany({
      where: { slug: { in: [...LIFTING_WORKOUT_SLUGS] } },
      select: { slug: true, name: true },
    }),
  ]);

  const sectionClasses = classes.filter((c) => !isGraduatingClassName(c.name));

  return (
    <AppShell nav={COACH_NAV} title="Workout programs">
      <p className="mb-6 max-w-2xl text-sm text-muted">
        Build reusable lifting templates and assign them to a class by date. Athletes log each set with
        weight, reps, and RPE from their Log workout screen.
      </p>
      <WorkoutProgramsPanel
        templates={templates.map((t) => ({
          ...t,
          updatedAt: t.updatedAt.toISOString(),
        }))}
        classes={sectionClasses}
        liftOptions={activities}
      />
    </AppShell>
  );
}
