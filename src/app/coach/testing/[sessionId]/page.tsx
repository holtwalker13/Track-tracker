import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getPreviousBest } from "@/lib/services/results";
import { LiveTestingGrid } from "@/components/testing/live-grid";
import { LiveSessionControls } from "@/components/testing/live-session-controls";
import { ActivityIcon } from "@/lib/activity-icons";
import { isWithinLiveWindow } from "@/lib/constants";
import { classSectionLabel } from "@/lib/periods";
import { cn } from "@/lib/utils";
import { SessionDateEditor } from "@/components/testing/session-date-editor";

export default async function LiveTestingPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ activity?: string }>;
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
      students: { include: { student: true } },
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

  return (
    <AppShell title="Live testing" nav={COACH_NAV} density="compact" navCompact>
      <LiveSessionControls
        sessionId={sessionId}
        status={testingSession.status}
        recordingUnlocked={testingSession.recordingUnlocked}
        withinWindow={withinWindow}
        compact
      />

      {/* Session meta — compact on mobile so roster stays the focus */}
      <div className="mb-2 flex items-baseline justify-between gap-2 sm:mb-3">
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold tracking-tight sm:text-xl">
            {testingSession.name}
          </h1>
          <p className="truncate text-[11px] text-muted sm:text-sm">{subtitle}</p>
        </div>
      </div>

      <details className="mb-2 sm:mb-3">
        <summary className="cursor-pointer text-xs font-medium text-muted hover:text-foreground">
          Test date & session options
        </summary>
        <div className="mt-2">
          <SessionDateEditor sessionId={sessionId} testingDate={testDay} />
        </div>
      </details>

      {/* Horizontal scrollable lift tabs — sticky under chrome */}
      <div className="sticky top-[3.25rem] z-30 -mx-3 mb-3 border-b border-card-border/80 bg-background/95 px-3 py-2 backdrop-blur sm:top-[3.75rem] sm:mx-0 sm:rounded-xl sm:border sm:px-2">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted sm:sr-only">
          Lifts
        </p>
        <div
          className={cn(
            "flex snap-x snap-mandatory gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          )}
          role="tablist"
          aria-label="Test events"
        >
          {testingSession.activities.map((a) => {
            const active = a.activity.slug === activitySlug;
            return (
              <Link
                key={a.id}
                role="tab"
                aria-selected={active}
                href={`/coach/testing/${sessionId}?activity=${a.activity.slug}`}
                className={cn(
                  "inline-flex shrink-0 snap-start items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap",
                  active
                    ? "bg-foreground text-background shadow-sm"
                    : "border border-card-border bg-card/60 text-muted hover:text-foreground"
                )}
              >
                <ActivityIcon
                  slug={a.activity.slug}
                  categorySlug={a.activity.category.slug}
                  className="h-3.5 w-3.5"
                />
                <span className="max-w-[9.5rem] truncate sm:max-w-none">{a.activity.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <LiveTestingGrid
        key={activity.id}
        sessionId={sessionId}
        activityId={activity.id}
        activityName={activity.name}
        activitySlug={activity.slug}
        activityUnit={activity.unit}
        subtitle={subtitle}
        rows={rows}
        readOnly={!coachCanEdit}
      />
    </AppShell>
  );
}
