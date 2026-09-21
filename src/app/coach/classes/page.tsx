import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { classYearLabel } from "@/lib/grades";
import { CreateClassForm, CreateWeightsPeriodsButton } from "@/components/classes/class-forms";
import { ImportRosterForm } from "@/components/roster/import-roster-form";

export default async function ClassesPage() {
  const session = await requireSchoolSession();

  const [classes, school] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId: session.schoolId },
      include: { _count: { select: { enrollments: true } } },
      orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
    }),
    prisma.school.findUnique({ where: { id: session.schoolId }, select: { slug: true } }),
  ]);

  const showJhsHelp = school?.slug === "jhs";

  return (
    <AppShell title="Classes" nav={COACH_NAV}>
      <p className="mb-6 max-w-3xl text-sm text-muted">
        Create or import classes. An athlete can sit in more than one — graduating year, a weights
        period, and a speed group at the same time.
        {showJhsHelp
          ? " This JHS roster starts empty: add weightlifting periods, then upload a spreadsheet."
          : null}
      </p>
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <CreateClassForm />
        <ImportRosterForm />
        <CreateWeightsPeriodsButton />
      </div>
      <ul className="space-y-2">
        {classes.map((c) => (
          <li key={c.id}>
            <Link
              href={`/coach/classes/${c.id}`}
              className="flex items-center justify-between rounded-xl border border-card-border bg-card px-4 py-3 hover:border-foreground/30"
            >
              <span>
                <span className="font-semibold">{c.name}</span>
                <span className="ml-2 text-sm text-muted">
                  {c.period ? `${c.period} · ` : ""}
                  {c.gradeLevel ? classYearLabel(c.gradeLevel) : "mixed"}
                </span>
              </span>
              <span className="text-sm text-muted">{c._count.enrollments} athletes</span>
            </Link>
          </li>
        ))}
        {classes.length === 0 && <li className="text-sm text-muted">No classes yet.</li>}
      </ul>
    </AppShell>
  );
}
