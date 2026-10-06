import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { classSectionLabel } from "@/lib/periods";
import { formatStudentName } from "@/lib/utils";
import { TestingPageActions } from "@/components/testing/testing-page-actions";
import {
  SessionResultsAccordion,
  type SessionActivitySummary,
} from "@/components/testing/session-results-accordion";
import { isWithinLiveWindow } from "@/lib/constants";
import { resolveCoachClassScopeFromParams } from "@/lib/queries/coach-scope-params";
import { testingSessionsForCoachView } from "@/lib/queries/coach-classes";
import { TestingLogNavLink } from "@/components/testing/testing-log-table";
import { listSchoolKpiLibrary } from "@/lib/queries/kpi-library";
import {
  ensureSchoolDefaultKpiSetId,
  getKpiSetMetricOrderingForClassScope,
} from "@/lib/services/kpi-sets";

export default async function TestingSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ coachId?: string; classId?: string }>;
}) {
  const session = await requireSchoolSession();
  const sp = await searchParams;
  const scope = await resolveCoachClassScopeFromParams(session, {
    coachId: sp.coachId,
    classId: sp.classId,
  });
  const activeClassId = scope.classId;

  const today = new Date();
  const dayStart = new Date(today.toISOString().slice(0, 10) + "T00:00:00");
  const dayEnd = new Date(today.toISOString().slice(0, 10) + "T23:59:59.999");

  const [allSessions, sameDayCount, kpiLibrary] = await Promise.all([
    testingSessionsForCoachView(session),
    prisma.testingSession.count({
      where: {
        schoolId: session.schoolId,
        testingDate: { gte: dayStart, lte: dayEnd },
      },
    }),
    listSchoolKpiLibrary(session.schoolId),
  ]);

  const sessions = activeClassId
    ? allSessions.filter((s) => s.classId === activeClassId)
    : [];
  const classes = scope.classes;

  // Every class's KPI set drives the test builder: ranked KPIs first, then the
  // set's unranked KPIs, then the rest of the school KPI library (testing
  // metrics + workout lifts + customs). A school default set is guaranteed so
  // classes without their own set still resolve the same library as the KPIs
  // tab.
  await ensureSchoolDefaultKpiSetId(session.schoolId);
  const metricsByClassId: Record<string, { ranked: string[]; unranked: string[] }> = {};
  for (const cls of classes) {
    metricsByClassId[cls.id] = await getKpiSetMetricOrderingForClassScope(
      session.schoolId,
      cls.id
    );
  }

  return (
    <AppShell title="Testing" nav={COACH_NAV}>
      <p className="mb-4 max-w-3xl text-sm text-muted">
        Start live tests only for a class or training group you lead. Add athletes on{" "}
        <Link href="/coach/school/classes" className="text-sky-300 hover:underline">
          Classes
        </Link>
        ; the full roster stays visible for reference.
      </p>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <TestingLogNavLink classId={activeClassId || undefined} />
      </div>
      <TestingPageActions
        coaches={scope.coaches}
        classes={classes}
        coachId={scope.coachId}
        classId={scope.classId}
        showCoachPicker={session.role === "ADMIN"}
        defaultClassId={activeClassId ?? classes[0]?.id}
        sameDayCount={sameDayCount}
        kpiLibrary={kpiLibrary}
        metricsByClassId={metricsByClassId}
      />
      {classes.length === 0 ? (
        <p className="mt-3 text-sm text-amber-300/90">
          You do not lead any classes yet. Create a training group under Classes, add your athletes, then
          return here to test.
        </p>
      ) : null}
      <div className="space-y-3">
        {sessions.length === 0 ? (
          <p className="text-sm text-muted">
            No testing sessions yet. Tap <span className="font-medium text-foreground">Create test</span> to
            schedule or start a live session.
          </p>
        ) : null}
        {sessions.map((s) => {
          const athletes = [...s.students]
            .map((ss) => ({
              id: ss.student.id,
              name: formatStudentName(ss.student.firstName, ss.student.lastName, true),
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
          const total = athletes.length;

          const activities: SessionActivitySummary[] = s.activities.map((sa) => {
            const recordedRows = athletes
              .map((athlete) => {
                const marks = s.results.filter(
                  (r) => r.studentId === athlete.id && r.activityId === sa.activityId
                );
                if (marks.length === 0) return null;
                const nonComplete = marks.find((r) => r.status !== "COMPLETED");
                if (nonComplete) {
                  return {
                    studentId: athlete.id,
                    name: athlete.name,
                    display: null,
                    status: nonComplete.status,
                  };
                }
                const best =
                  marks.find((r) => r.isBestAttempt && r.status === "COMPLETED") ??
                  marks.find((r) => r.status === "COMPLETED");
                if (!best) return null;
                return {
                  studentId: athlete.id,
                  name: athlete.name,
                  display: best.displayValue,
                  status: "COMPLETED",
                };
              })
              .filter((row): row is NonNullable<typeof row> => row != null);

            const recordedIds = new Set(recordedRows.map((r) => r.studentId));
            const pendingNames = athletes
              .filter((a) => !recordedIds.has(a.id))
              .map((a) => a.name);

            return {
              activityId: sa.activityId,
              slug: sa.activity.slug,
              name: sa.activity.name,
              recorded: recordedRows.length,
              total,
              recordedRows,
              pendingNames,
            };
          });

          const hasResults = s.results.length > 0;
          const live =
            (s.status === "LIVE" || s.status === "ACTIVE" || s.status === "DRAFT") &&
            s.recordingUnlocked &&
            isWithinLiveWindow(s.liveOpenedAt);
          const meta = [
            new Date(s.testingDate).toLocaleDateString(),
            s.schoolYear.label,
            s.class ? classSectionLabel(s.class) : null,
            `${total} athletes`,
            s.status === "CLOSED" || s.status === "COMPLETED"
              ? "closed"
              : s.status === "PAUSED"
                ? "paused"
                : live
                  ? "live"
                  : null,
            !hasResults && total === 0 ? "empty" : null,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <SessionResultsAccordion
              key={s.id}
              sessionId={s.id}
              sessionName={s.name}
              meta={meta}
              live={live}
              activityChips={s.activities.map((a) => ({
                slug: a.activity.slug,
                name: a.activity.name,
              }))}
              activities={activities}
              hasResults={hasResults}
            />
          );
        })}
      </div>
    </AppShell>
  );
}
