import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { classYearLabel } from "@/lib/grades";
import { listStudents } from "@/lib/queries/coach";
import { ClassRosterEditor } from "@/components/classes/class-roster-editor";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) redirect("/login");
  const { id } = await params;

  const cls = await prisma.class.findFirst({
    where: { id, schoolId: session.schoolId },
    include: { enrollments: true },
  });
  if (!cls) notFound();

  const athletes = await listStudents(session.schoolId, {});

  return (
    <AppShell
      title={cls.name}
      subtitle={`${cls.period ? `${cls.period} · ` : ""}${
        cls.gradeLevel ? classYearLabel(cls.gradeLevel) : "mixed classes"
      } · athletes can also be in other classes`}
      nav={COACH_NAV}
    >
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
    </AppShell>
  );
}
