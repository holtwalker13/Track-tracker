import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { coachProfileForSession } from "@/lib/auth/coach-scope";
import { prisma } from "@/lib/db";
import { classYearLabel } from "@/lib/grades";
import { listStudents } from "@/lib/queries/coach";
import { ClassRosterEditor } from "@/components/classes/class-roster-editor";
import { ClassSubgroupEditor } from "@/components/classes/class-subgroup-editor";
import { listClassSubgroups } from "@/lib/queries/class-subgroups";
import { ClassMetaEditor } from "@/components/classes/class-meta-editor";
import { coachDisplayName } from "@/lib/coach-display";
import { ensureClassCoachRowsFromLead } from "@/lib/services/class-coaches";

export default async function SchoolClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const session = await requireSchoolSession();
  const { id } = await params;
  const sp = await searchParams;
  const openClassEditor = sp.edit === "1" || sp.edit === "true";
  await ensureClassCoachRowsFromLead(session.schoolId);

  const [cls, coaches, profile] = await Promise.all([
    prisma.class.findFirst({
      where: { id, schoolId: session.schoolId },
      include: {
        enrollments: true,
        coachAssignments: {
          include: {
            coach: {
              select: {
                id: true,
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        coach: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    prisma.coachProfile.findMany({
      where: { schoolId: session.schoolId },
      orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
      select: {
        id: true,
        user: { select: { firstName: true, lastName: true } },
      },
    }),
    coachProfileForSession(session),
  ]);
  if (!cls) notFound();

  const [athletes, subgroups] = await Promise.all([
    listStudents(session.schoolId, {}),
    listClassSubgroups(id),
  ]);
  const coachOptions = coaches.map((c) => ({
    id: c.id,
    firstName: c.user.firstName,
    lastName: c.user.lastName,
  }));

  const assignedIds = [
    ...new Set([
      ...cls.coachAssignments.map((a) => a.coachId),
      ...(cls.coachId ? [cls.coachId] : []),
    ]),
  ];

  const canEdit =
    session.role === "ADMIN" ||
    assignedIds.length === 0 ||
    (profile != null && assignedIds.includes(profile.id));

  const coachLabels = assignedIds
    .map((cid) => {
      const fromAssign = cls.coachAssignments.find((a) => a.coachId === cid)?.coach;
      const c = fromAssign ?? (cls.coach?.id === cid ? cls.coach : null);
      return c
        ? coachDisplayName({
            firstName: c.user.firstName,
            lastName: c.user.lastName,
          })
        : null;
    })
    .filter(Boolean);

  return (
    <>
      <p className="mb-3 text-sm">
        <Link href="/coach/school/classes" className="text-accent hover:underline">
          ← Classes
        </Link>
      </p>
      <div className="mb-6 border-b border-card-border pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{cls.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {cls.period ? `${cls.period} · ` : ""}
              {cls.gradeLevel ? classYearLabel(cls.gradeLevel) : "mixed classes"}
              {" · "}
              Coaches: {coachLabels.length ? coachLabels.join(", ") : "Unassigned"}
              {" · "}athletes can also be in other classes
            </p>
          </div>
        </div>
        {canEdit ? (
          <ClassMetaEditor
            classId={cls.id}
            name={cls.name}
            period={cls.period}
            gradeLevel={cls.gradeLevel}
            coachIds={assignedIds}
            coaches={coachOptions}
            canEditCoach={canEdit}
            defaultEditing={openClassEditor}
          />
        ) : null}
      </div>
      <ClassRosterEditor
        classId={cls.id}
        enrolledIds={cls.enrollments.map((e) => e.studentId)}
        athletes={athletes.map((s) => ({
          id: s.id,
          name: s.name,
          studentNumber: s.studentNumber,
          grade: s.grade ?? null,
        }))}
      />
      {canEdit ? (
        <ClassSubgroupEditor
          classId={cls.id}
          enrolledIds={cls.enrollments.map((e) => e.studentId)}
          athletes={athletes.map((s) => ({
            id: s.id,
            name: s.name,
            studentNumber: s.studentNumber,
          }))}
          initialSubgroups={subgroups}
        />
      ) : null}
    </>
  );
}
