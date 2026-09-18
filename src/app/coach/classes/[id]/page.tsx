import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { classYearLabel } from "@/lib/grades";
import { listStudents } from "@/lib/queries/coach";
import { ClassRosterEditor } from "@/components/classes/class-roster-editor";
import { ClassMetaEditor } from "@/components/classes/class-meta-editor";

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
    <AppShell title="Classes" nav={COACH_NAV}>
      <div className="mb-6 border-b border-card-border pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{cls.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {cls.period ? `${cls.period} · ` : ""}
              {cls.gradeLevel ? classYearLabel(cls.gradeLevel) : "mixed classes"}
              {" · "}athletes can also be in other classes
            </p>
          </div>
          <ClassMetaEditor
            classId={cls.id}
            name={cls.name}
            period={cls.period}
            gradeLevel={cls.gradeLevel}
          />
        </div>
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
    </AppShell>
  );
}
