import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { ActivityIcon } from "@/lib/activity-icons";
import { classYearLabel } from "@/lib/grades";

export default async function TestingSessionsPage() {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) redirect("/login");

  const sessions = await prisma.testingSession.findMany({
    where: { schoolId: session.schoolId },
    include: { schoolYear: true, activities: { include: { activity: true } } },
    orderBy: { testingDate: "desc" },
  });

  return (
    <AppShell title="Testing" nav={COACH_NAV}>
      <p className="mb-4 text-muted">Who still needs a score?</p>
      <div className="space-y-4">
        {sessions.map((s) => (
          <Card key={s.id}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle>{s.name}</CardTitle>
                <p className="mt-1 text-sm text-muted">
                  {new Date(s.testingDate).toLocaleDateString()} · {s.schoolYear.label}
                  {s.gradeLevel ? ` · ${classYearLabel(s.gradeLevel)}` : ""}
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
              <div className="flex gap-2">
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
              </div>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
