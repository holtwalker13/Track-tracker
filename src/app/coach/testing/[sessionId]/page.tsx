import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getPreviousBest } from "@/lib/services/results";
import { LiveTestingGrid } from "@/components/testing/live-grid";

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
      activities: { include: { activity: true }, orderBy: { sortOrder: "asc" } },
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
  const subtitle = `Grade ${testingSession.gradeLevel ?? "—"} · ${testingSession.schoolYear.label}`;

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
    <AppShell title="Live Testing" nav={COACH_NAV}>
      <div className="mb-4 flex flex-wrap gap-2">
        {testingSession.activities.map((a) => (
          <Link
            key={a.id}
            href={`/coach/testing/${sessionId}?activity=${a.activity.slug}`}
            className={`rounded-full px-3 py-1 text-sm ${
              a.activity.slug === activitySlug
                ? "bg-accent text-background"
                : "border border-card-border"
            }`}
          >
            {a.activity.name}
          </Link>
        ))}
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
