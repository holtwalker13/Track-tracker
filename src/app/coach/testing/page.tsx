import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { ActivityIcon } from "@/lib/activity-icons";
import { classYearLabel } from "@/lib/grades";
import { NewTestingSessionForm } from "@/components/testing/new-session-form";
import { DeleteSessionButton } from "@/components/testing/delete-session-button";

export default async function TestingSessionsPage() {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) redirect("/login");

  const [sessions, classes] = await Promise.all([
    prisma.testingSession.findMany({
      where: { schoolId: session.schoolId },
      include: {
        schoolYear: true,
        activities: { include: { activity: true } },
        class: true,
        _count: { select: { students: true } },
        results: { select: { id: true }, take: 1 },
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
        Every live session needs a test date so average, PR, and progress charts can line up over
        time. Delete empty or unused sessions anytime.
      </p>
      <NewTestingSessionForm classes={classes} />
      <div className="space-y-4">
        {sessions.map((s) => {
          const hasResults = s.results.length > 0;
          return (
            <Card key={s.id}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle>{s.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted">
                    {new Date(s.testingDate).toLocaleDateString()} · {s.schoolYear.label}
                    {s.class ? ` · ${s.class.name}` : ""}
                    {s.gradeLevel ? ` · ${classYearLabel(s.gradeLevel)}` : ""}
                    {` · ${s._count.students} athletes`}
                    {!hasResults && s._count.students === 0 ? " · empty" : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {s.activities.map((a) => (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-card-border px-2.5 py-1 text-xs"
                      >
                        <ActivityIcon slug={a.activity.slug} className="h-3.5 w-3.5" />
                        {a.activity.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/coach/testing/${s.id}`}
                    className="rounded-lg bg-accent px-4 py-2 font-medium text-background"
                  >
                    Live testing
                  </Link>
                  <Link
                    href={`/coach/testing/${s.id}/station`}
                    className="rounded-lg border border-card-border px-4 py-2"
                  >
                    Student station
                  </Link>
                  <DeleteSessionButton
                    sessionId={s.id}
                    sessionName={s.name}
                    hasResults={hasResults}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
