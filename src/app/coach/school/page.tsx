import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { requireSchoolSession } from "@/lib/auth/session";
import { getCoachDashboard } from "@/lib/queries/coach";
import { prisma } from "@/lib/db";

export default async function SchoolOverviewPage() {
  const session = await requireSchoolSession();
  const [data, school, classCount, studentCount, coaches] = await Promise.all([
    getCoachDashboard(session.schoolId),
    prisma.school.findUnique({
      where: { id: session.schoolId },
      select: { name: true, slug: true },
    }),
    prisma.class.count({ where: { schoolId: session.schoolId } }),
    prisma.studentProfile.count({ where: { schoolId: session.schoolId } }),
    prisma.coachProfile.findMany({
      where: { schoolId: session.schoolId },
      select: {
        id: true,
        user: { select: { firstName: true, lastName: true, email: true } },
        _count: { select: { classes: true } },
      },
      orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{school?.name ?? "School"}</h2>
        <p className="mt-1 text-sm text-muted">
          Foundational setup for this school — roster, classes, and coaches.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardTitle>Athletes</CardTitle>
          <p className="mt-2 text-3xl font-bold tabular-nums text-accent">{studentCount}</p>
          <Link href="/coach/school/roster" className="mt-2 inline-block text-sm text-accent hover:underline">
            Open roster →
          </Link>
        </Card>
        <Card>
          <CardTitle>Classes</CardTitle>
          <p className="mt-2 text-3xl font-bold tabular-nums text-accent">{classCount}</p>
          <Link href="/coach/school/classes" className="mt-2 inline-block text-sm text-accent hover:underline">
            Manage classes →
          </Link>
        </Card>
        <Card>
          <CardTitle>Tested this year</CardTitle>
          <p className="mt-2 text-3xl font-bold tabular-nums text-accent">{data.studentsTested}</p>
        </Card>
      </div>

      <Card>
        <CardTitle>Coaches</CardTitle>
        <ul className="mt-4 divide-y divide-card-border/60">
          {coaches.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>
                <span className="font-medium">
                  {c.user.firstName} {c.user.lastName}
                </span>
                <span className="ml-2 text-muted">{c.user.email}</span>
              </span>
              <span className="text-muted">{c._count.classes} classes</span>
            </li>
          ))}
          {coaches.length === 0 && <li className="py-2 text-sm text-muted">No coaches yet.</li>}
        </ul>
      </Card>

      <Card>
        <CardTitle>Recent testing sessions</CardTitle>
        <ul className="mt-4 space-y-3">
          {data.recentSessions.map((s) => (
            <li key={s.id} className="flex justify-between text-sm">
              <Link href={`/coach/testing/${s.id}`} className="hover:text-accent">
                {s.name}
              </Link>
              <span className="text-muted">{s.schoolYear.label}</span>
            </li>
          ))}
          {data.recentSessions.length === 0 && (
            <li className="text-sm text-muted">No sessions yet.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
