import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { CoachClassScopeBar } from "@/components/coach/coach-class-scope-bar";
import { TestingLogGrid, TestingLogSessionPicker } from "@/components/testing/testing-log-table";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { resolveCoachClassScopeFromParams } from "@/lib/queries/coach-scope-params";
import {
  getTestingLogGrid,
  listTestingLogSessionsForClass,
} from "@/lib/queries/testing-log";

export default async function TestingLogPage({
  searchParams,
}: {
  searchParams: Promise<{ coachId?: string; classId?: string; sessionId?: string }>;
}) {
  const session = await requireSchoolSession();
  const sp = await searchParams;
  const scope = await resolveCoachClassScopeFromParams(session, {
    coachId: sp.coachId,
    classId: sp.classId,
  });

  const sessions = scope.classId
    ? await listTestingLogSessionsForClass(session.schoolId, scope.classId)
    : [];

  const sessionId =
    sp.sessionId && sessions.some((s) => s.id === sp.sessionId)
      ? sp.sessionId
      : sessions[0]?.id ?? "";

  const grid = sessionId ? await getTestingLogGrid(sessionId, session.schoolId) : null;

  return (
    <AppShell title="Testing log" nav={COACH_NAV}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href="/coach/testing" className="text-sm text-muted hover:text-foreground">
          ← Back to testing
        </Link>
      </div>

      <CoachClassScopeBar
        coaches={scope.coaches}
        classes={scope.classes}
        subgroups={[]}
        coachId={scope.coachId}
        classId={scope.classId}
        showCoach={session.role === "ADMIN"}
        showSubgroup={false}
      />

      {!scope.classId ? (
        <p className="mt-4 text-sm text-muted">Select a class to view testing history.</p>
      ) : (
        <div className="mt-4 space-y-4">
          <TestingLogSessionPicker sessions={sessions} sessionId={sessionId} />
          {grid ? (
            <>
              <p className="text-sm text-muted">
                {grid.session.name} · {new Date(grid.session.testingDate).toLocaleDateString()}
              </p>
              <TestingLogGrid columns={grid.columns} rows={grid.rows} />
            </>
          ) : (
            <p className="text-sm text-muted">No completed sessions to show yet.</p>
          )}
        </div>
      )}
    </AppShell>
  );
}
