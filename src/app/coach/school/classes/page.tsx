import { requireSchoolSession } from "@/lib/auth/session";
import { coachProfileForSession } from "@/lib/auth/coach-scope";
import { prisma } from "@/lib/db";
import { ClassesPageActions } from "@/components/classes/classes-page-actions";
import { SchoolClassExpandableRow } from "@/components/classes/school-class-expandable-row";
import { ensureClassCoachRowsFromLead } from "@/lib/services/class-coaches";

export default async function SchoolClassesPage() {
  const session = await requireSchoolSession();
  const profile = await coachProfileForSession(session);
  await ensureClassCoachRowsFromLead(session.schoolId);

  const [classes, coaches] = await Promise.all([
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
        subgroups: {
          orderBy: { sortOrder: "asc" },
          include: {
            members: {
              include: {
                student: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
        enrollments: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
        },
      },
      orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
    }),
    prisma.coachProfile.findMany({
      where: { schoolId: session.schoolId },
      orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
      select: {
        id: true,
        user: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

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
            <SchoolClassExpandableRow
              key={c.id}
              classId={c.id}
              name={c.name}
              period={c.period}
              programKind={c.programKind}
              gradeLevel={c.gradeLevel}
              athleteCount={c._count.enrollments}
              coachIds={assignedIds}
              coaches={coachOptions}
              canEdit={canEdit}
              subgroups={c.subgroups.map((sg) => ({
                id: sg.id,
                name: sg.name,
                members: sg.members.map((m) => m.student),
              }))}
              roster={c.enrollments.map((e) => e.student)}
            />
          );
        })}
        {classes.length === 0 && <li className="text-sm text-muted">No classes yet.</li>}
      </ul>
    </>
  );
}
