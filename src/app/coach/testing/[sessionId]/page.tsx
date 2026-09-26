import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getPreviousBest } from "@/lib/services/results";
import { LiveTestingStudio } from "@/components/testing/live-testing-studio";
import { LiveSessionControls } from "@/components/testing/live-session-controls";
import { isWithinLiveWindow } from "@/lib/constants";
import { classSectionLabel } from "@/lib/periods";
import { SessionDateEditor } from "@/components/testing/session-date-editor";

export default async function LiveTestingPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ activity?: string; student?: string }>;
}) {
  const session = await requireSchoolSession();
  const { sessionId } = await params;
  const sp = await searchParams;

  const testingSession = await prisma.testingSession.findUnique({
    where: { id: sessionId },
    include: {
      activities: {
        include: { activity: { include: { category: true } } },
        orderBy: { sortOrder: "asc" },
      },
      students: {
        include: { student: true },
        orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
      },
      schoolYear: true,
      class: true,
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
  const classLabel = testingSession.class
    ? classSectionLabel(testingSession.class)
    : "No class";
  const subtitle = `${new Date(testingSession.testingDate).toLocaleDateString()} · ${classLabel} · ${testingSession.schoolYear.label}`;

  const existingResults = await prisma.performanceResult.findMany({
    where: {
      testingSessionId: sessionId,
      activityId: activity.id,
      status: { not: "SUPERSEDED" },
    },
    orderBy: [{ createdAt: "desc" }, { attemptNumber: "asc" }],
  });

  const withinWindow = isWithinLiveWindow(testingSession.liveOpenedAt);
  const status = testingSession.status;
  const coachCanEdit =
    withinWindow &&
    status !== "CLOSED" &&
    status !== "COMPLETED" &&
    status !== "PAUSED";

  const rows = await Promise.all(
    testingSession.students.map(async (ss) => {
      const prev = await getPreviousBest(ss.studentId, activity.id, testingSession.testingDate);
      const mine = existingResults.filter((r) => r.studentId === ss.studentId);
      const nonComplete = mine.find((r) => r.status !== "COMPLETED");
      const completed = mine.filter((r) => r.status === "COMPLETED");

      const byAttempt = new Map<number, (typeof completed)[number]>();
      for (const r of completed) {
        const n = r.attemptNumber ?? 1;
        if (!byAttempt.has(n)) byAttempt.set(n, r);
      }
      const attempts: (string | number)[] = ["", "", ""];
      for (const [n, r] of byAttempt) {
        const idx = Math.max(0, Math.min(2, n - 1));
        if (r.resultValue != null) attempts[idx] = r.resultValue;
      }
      const best = [...byAttempt.values()].find((r) => r.isBestAttempt);
      const hasMark = byAttempt.size > 0 || Boolean(nonComplete);
      return {
        studentId: ss.studentId,
        firstName: ss.student.firstName,
        lastName: ss.student.lastName,
        previousBest: prev,
        attempts,
        status: nonComplete?.status ?? "COMPLETED",
        saved: hasMark,
        pr: Boolean(best?.isPersonalRecord),
      };
    })
  );

  const activities = testingSession.activities.map((a) => ({
    id: a.activity.id,
    slug: a.activity.slug,
    name: a.activity.name,
    unit: a.activity.unit,
    categorySlug: a.activity.category.slug,
  }));

  return (
    <AppShell title="Fitness Testing" nav={COACH_NAV} density="compact" navCompact>
      <LiveSessionControls
        sessionId={sessionId}
        status={testingSession.status}
        recordingUnlocked={testingSession.recordingUnlocked}
        withinWindow={withinWindow}
        compact
      />

      <div className="mb-2 flex items-baseline justify-between gap-2 sm:mb-3">
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold tracking-tight sm:text-xl">
            {testingSession.name}
          </h1>
          <p className="truncate text-[11px] text-muted sm:text-sm">{subtitle}</p>
        </div>
      </div>

      <details className="mb-3">
        <summary className="cursor-pointer text-xs font-medium text-muted hover:text-foreground">
          Test date & session options
        </summary>
        <div className="mt-2">
          <SessionDateEditor sessionId={sessionId} testingDate={testDay} />
        </div>
      </details>

      <LiveTestingStudio
        key={`${activity.id}-${sp.student ?? "first"}`}
        sessionId={sessionId}
        sessionPath={`/coach/testing/${sessionId}`}
        activities={activities}
        activitySlug={activity.slug}
        activityId={activity.id}
        activityName={activity.name}
        activityUnit={activity.unit}
        scoringDirection={activity.scoringDirection as "HIGHER_BETTER" | "LOWER_BETTER"}
        rows={rows}
        readOnly={!coachCanEdit}
        selectedStudentId={sp.student}
      />
    </AppShell>
  );
}
