import Link from "next/link";
import { requireSchoolSession } from "@/lib/auth/session";
import { coachProfileForSession } from "@/lib/auth/coach-scope";
import { prisma } from "@/lib/db";
import { classYearLabel } from "@/lib/grades";
import { ClassesPageActions } from "@/components/classes/classes-page-actions";
import { ClassCoachInlineSelect } from "@/components/classes/class-coach-select";
import { ensureClassCoachRowsFromLead } from "@/lib/services/class-coaches";

export default async function SchoolClassesPage() {
  const session = await requireSchoolSession();
  const profile = await coachProfileForSession(session);
  await ensureClassCoachRowsFromLead(session.schoolId);

  const [classes, school, coaches] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId: session.schoolId },
      include: {
        _count: { select: { enrollments: true } },
        coachAssignments: { select: { coachId: true } },
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
        Create or import classes and training groups. Assign one or more coaches to each class —
        live testing and programs follow those coaches’ groups.
        {showJhsHelp
          ? " This JHS roster starts empty: add weightlifting periods, then upload a spreadsheet."
          : null}
      </p>
      <ClassesPageActions coaches={coachOptions} defaultCoachId={defaultCoachId} />
      <ul className="mt-4 space-y-2">
        {classes.map((c) => {
          const assignedIds = [
            ...new Set([
              ...c.coachAssignments.map((a) => a.coachId),
              ...(c.coachId ? [c.coachId] : []),
            ]),
          ];
          const canEdit =
            session.role === "ADMIN" ||
            assignedIds.length === 0 ||
            (profile != null && assignedIds.includes(profile.id));
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
                <div className="flex flex-wrap items-center gap-2">
                  {canEdit ? (
                    <Link
                      href={`/coach/school/classes/${c.id}?edit=1`}
                      className="rounded-lg border border-card-border px-3 py-1.5 text-sm text-muted hover:border-sky-400/40 hover:text-foreground"
                    >
                      Rename
                    </Link>
                  ) : null}
                  <ClassCoachInlineSelect
                    classId={c.id}
                    coachIds={assignedIds}
                    coaches={coachOptions}
                    canEdit={canEdit}
                  />
                </div>
              </div>
            </li>
          );
        })}
        {classes.length === 0 && <li className="text-sm text-muted">No classes yet.</li>}
      </ul>
    </>
  );
}
