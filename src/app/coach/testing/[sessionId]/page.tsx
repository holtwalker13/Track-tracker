import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getPreviousBest } from "@/lib/services/results";
import { LiveTestingGrid } from "@/components/testing/live-grid";
import { ActivityIcon } from "@/lib/activity-icons";
import { classYearLabel } from "@/lib/grades";
import { cn } from "@/lib/utils";
import { SessionDateEditor } from "@/components/testing/session-date-editor";

export default async function LiveTestingPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ activity?: string }>;
}) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) redirect("/login");
  const { sessionId } = await params;
  const sp = await searchParams;

  const testingSession = await prisma.testingSession.findUnique({
    where: { id: sessionId },
    include: {
      activities: { include: { activity: { include: { category: true } } }, orderBy: { sortOrder: "asc" } },
      students: { include: { student: true } },
      schoolYear: true,
    },
  });
  if (!testingSession || testingSession.schoolId !== session.schoolId) notFound();

  const activitySlug = sp.activity ?? testingSession.activities[0]?.activity.slug;
  const sessionActivity = testingSession.activities.find(
    (a) => a.activity.slug === activitySlug
  );
  if (!sessionActivity) notFound();

  const activity = sessionActivity.activity;
  const testDay = testingSession.testingDate.toISOString().slice(0, 10);
  const subtitle = `${new Date(testingSession.testingDate).toLocaleDateString()} · ${
    testingSession.gradeLevel ? classYearLabel(testingSession.gradeLevel) : "All classes"
  } · ${testingSession.schoolYear.label}`;

  const rows = await Promise.all(
    testingSession.students.map(async (ss) => {
      const prev = await getPreviousBest(ss.studentId, activity.id, testingSession.testingDate);
      return {
        studentId: ss.studentId,
        firstName: ss.student.firstName,
        lastName: ss.student.lastName,
        previousBest: prev,
        attempts: ["", "", ""] as (string | number)[],
        status: "COMPLETED",
      };
    })
  );

  return (
    <AppShell title="Live testing" nav={COACH_NAV}>
      <div className="mb-6 border-b border-card-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight">{testingSession.name}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>
      <SessionDateEditor sessionId={sessionId} testingDate={testDay} />
      <div className="mb-4 flex flex-wrap gap-2">
        {testingSession.activities.map((a) => {
          const active = a.activity.slug === activitySlug;
          return (
            <Link
              key={a.id}
              href={`/coach/testing/${sessionId}?activity=${a.activity.slug}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium",
                active
                  ? "bg-foreground text-background"
                  : "border border-card-border text-muted hover:text-foreground"
              )}
            >
              <ActivityIcon
                slug={a.activity.slug}
                categorySlug={a.activity.category.slug}
                className="h-4 w-4"
              />
              {a.activity.name}
            </Link>
          );
        })}
      </div>
      <LiveTestingGrid
        sessionId={sessionId}
        activityId={activity.id}
        activityName={activity.name}
        subtitle={subtitle}
        rows={rows}
      />
    </AppShell>
  );
}
