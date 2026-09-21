import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ADMIN_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { CreateClassForm } from "@/components/classes/class-forms";
import { AddStudentForm } from "@/components/athletes/add-student-form";
import { ImportRosterForm } from "@/components/roster/import-roster-form";
import { EnterSchoolButton } from "@/components/admin/enter-school-button";
import { tenantBySlug } from "@/lib/tenants";

export default async function AdminPage() {
  const session = await requireSession(["ADMIN"]);
  if (!session) redirect("/login");

  const schools = await prisma.school.findMany({
    include: {
      _count: { select: { studentProfiles: true, classes: true, coachProfiles: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const classes = session.schoolId
    ? await prisma.class.findMany({
        where: { schoolId: session.schoolId },
        orderBy: [{ period: "asc" }, { name: "asc" }],
        select: { id: true, name: true, period: true },
      })
    : [];

  return (
    <AppShell title="App admin" nav={ADMIN_NAV}>
      <p className="mb-6 max-w-3xl text-sm text-muted">
        Pick a school system to work in. Coach and student logins stay locked to their own school.
        From here you can add weightlifting classes, add students, or upload a roster spreadsheet.
      </p>
      <ul className="mb-10 grid gap-3 md:grid-cols-3">
        {schools.map((school) => {
          const tenant = tenantBySlug(school.slug);
          const active = session.schoolId === school.id;
          return (
            <li
              key={school.id}
              className={`rounded-2xl border bg-card p-4 ${
                active ? "border-accent ring-1 ring-accent/40" : "border-card-border"
              }`}
            >
              <p className="text-xs uppercase tracking-widest text-muted">{school.slug ?? "school"}</p>
              <h2 className="mt-1 text-lg font-semibold">{school.name}</h2>
              <p className="mt-2 text-sm text-muted">
                {school._count.studentProfiles} students · {school._count.classes} classes ·{" "}
                {school._count.coachProfiles} coaches
              </p>
              {tenant?.emptyRoster && school._count.studentProfiles === 0 && (
                <p className="mt-2 text-xs text-accent">Empty — ready for a roster upload.</p>
              )}
              <div className="mt-4">
                <EnterSchoolButton schoolId={school.id} active={active} />
              </div>
            </li>
          );
        })}
      </ul>

      {session.schoolId ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <CreateClassForm />
          <AddStudentForm classes={classes} />
          <div className="lg:col-span-2">
            <ImportRosterForm />
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">Enter a school above to add classes or students.</p>
      )}
    </AppShell>
  );
}
