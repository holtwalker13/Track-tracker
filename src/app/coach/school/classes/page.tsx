import Link from "next/link";
import { requireSchoolSession } from "@/lib/auth/session";
import { coachProfileForSession } from "@/lib/auth/coach-scope";
import { prisma } from "@/lib/db";
import { classYearLabel } from "@/lib/grades";
import { ClassesPageActions } from "@/components/classes/classes-page-actions";
import { ClassCoachInlineSelect } from "@/components/classes/class-coach-select";

export default async function SchoolClassesPage() {
  const session = await requireSchoolSession();
  const profile = await coachProfileForSession(session);

  const [classes, school, coaches] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId: session.schoolId },
      include: {
        _count: { select: { enrollments: true } },
        coach: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
    }),
    prisma.school.findUnique({ where: { id: session.schoolId }, select: { slug: true } }),
    prisma.coachProfile.findMany({
      where: { schoolId: session.schoolId },
      orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
      select: {
        id: true,
        user: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const showJhsHelp = school?.slug === "jhs";
  const coachOptions = coaches.map((c) => ({
    id: c.id,
    firstName: c.user.firstName,
    lastName: c.user.lastName,
  }));
  const defaultCoachId =
    profile?.id && coachOptions.some((c) => c.id === profile.id)
      ? profile.id
      : coachOptions[0]?.id ?? "";

  return (
    <>
      <p className="mb-6 max-w-3xl text-sm text-muted">
        Create or import classes and training groups. Each class needs an assigned coach — live
        testing and programs follow that coach’s groups.
        {showJhsHelp
          ? " This JHS roster starts empty: add weightlifting periods, then upload a spreadsheet."
          : null}
      </p>
      <ClassesPageActions coaches={coachOptions} defaultCoachId={defaultCoachId} />
      <ul className="mt-4 space-y-2">
        {classes.map((c) => {
          const canEdit =
            session.role === "ADMIN" ||
            c.coachId == null ||
            (profile != null && c.coachId === profile.id);
          return (
            <li key={c.id}>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-card-border bg-card px-4 py-3">
                <Link
                  href={`/coach/school/classes/${c.id}`}
                  className="min-w-0 flex-1 hover:text-accent"
                >
                  <span className="font-semibold">{c.name}</span>
                  <span className="ml-2 text-sm text-muted">
                    {c.programKind === "TRAINING"
                      ? "Training · "
                      : c.programKind === "SCHOLASTIC"
                        ? "Class · "
                        : ""}
                    {c.period ? `${c.period} · ` : ""}
                    {c.gradeLevel ? classYearLabel(c.gradeLevel) : "mixed"}
                    {" · "}
                    {c._count.enrollments} athletes
                  </span>
                </Link>
                <ClassCoachInlineSelect
                  classId={c.id}
                  coachId={c.coachId}
                  coaches={coachOptions}
                  canEdit={canEdit}
                />
              </div>
            </li>
          );
        })}
        {classes.length === 0 && <li className="text-sm text-muted">No classes yet.</li>}
      </ul>
    </>
  );
}
