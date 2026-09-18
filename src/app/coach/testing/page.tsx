import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { classYearLabel } from "@/lib/grades";
import { formatStudentName } from "@/lib/utils";
import { NewTestingSessionForm } from "@/components/testing/new-session-form";
import {
  SessionResultsAccordion,
  type SessionActivitySummary,
} from "@/components/testing/session-results-accordion";

export default async function TestingSessionsPage() {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) redirect("/login");

  const [sessions, classes] = await Promise.all([
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
      orderBy: { name: "asc" },
      select: { id: true, name: true, period: true },
    }),
  ]);

  return (
    <AppShell title="Testing" nav={COACH_NAV}>
      <p className="mb-4 text-muted">
        Start a session, record what you can, then leave — expand any test below to see who still
        needs a mark at each station. Continue picks up where you left off.
      </p>
      <NewTestingSessionForm classes={classes} />
      <div className="space-y-3">
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
          const meta = [
            new Date(s.testingDate).toLocaleDateString(),
            s.schoolYear.label,
            s.class?.name,
            s.gradeLevel ? classYearLabel(s.gradeLevel) : null,
            `${total} athletes`,
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
