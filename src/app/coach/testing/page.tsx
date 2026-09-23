import { AppShell } from "@/components/layout/app-shell";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { classSectionLabel } from "@/lib/periods";
import { formatStudentName } from "@/lib/utils";
import { TestingPageActions } from "@/components/testing/testing-page-actions";
import { liftsForTestingSession, listSchoolLifts } from "@/lib/queries/lifts";
import {
  SessionResultsAccordion,
  type SessionActivitySummary,
} from "@/components/testing/session-results-accordion";
import { isWithinLiveWindow } from "@/lib/constants";

export default async function TestingSessionsPage() {
  const session = await requireSchoolSession();

  const today = new Date();
  const dayStart = new Date(today.toISOString().slice(0, 10) + "T00:00:00");
  const dayEnd = new Date(today.toISOString().slice(0, 10) + "T23:59:59.999");

  const [sessions, classes, sameDayCount, schoolLifts] = await Promise.all([
    prisma.testingSession.findMany({
      where: { schoolId: session.schoolId },
      include: {
        schoolYear: true,
        activities: {
          include: { activity: true },
          orderBy: { sortOrder: "asc" },
        },
        class: true,
        students: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        results: {
          where: { status: { not: "SUPERSEDED" } },
          select: {
            studentId: true,
            activityId: true,
            status: true,
            resultValue: true,
            displayValue: true,
            isBestAttempt: true,
          },
        },
      },
      orderBy: { testingDate: "desc" },
    }),
    prisma.class.findMany({
      where: { schoolId: session.schoolId },
      orderBy: [{ period: "asc" }, { name: "asc" }],
      select: { id: true, name: true, period: true },
    }),
    prisma.testingSession.count({
      where: {
        schoolId: session.schoolId,
        testingDate: { gte: dayStart, lte: dayEnd },
      },
    }),
    listSchoolLifts(session.schoolId),
  ]);

  const strengthActivities = liftsForTestingSession(schoolLifts).map((l) => ({
    slug: l.slug,
    name: l.name,
  }));

  return (
    <AppShell title="Testing" nav={COACH_NAV}>
      <TestingPageActions
        classes={classes}
        sameDayCount={sameDayCount}
        strengthActivities={strengthActivities}
      />
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
