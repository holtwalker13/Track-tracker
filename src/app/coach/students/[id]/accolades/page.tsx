import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AccoladesBoard } from "@/components/gamification/accolades-board";
import { COACH_NAV } from "@/lib/navigation";
import { requireSchoolSession } from "@/lib/auth/session";
import { getAccoladeProgressForStudent } from "@/lib/gamification/engine";
import { ensureAccoladeDefinitions } from "@/lib/gamification/seed-accolades";
import { prisma } from "@/lib/db";

export default async function CoachStudentAccoladesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSchoolSession();
  const { id } = await params;
  const student = await prisma.studentProfile.findFirst({
    where: { id, schoolId: session.schoolId },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!student) notFound();

  await ensureAccoladeDefinitions();
  const progress = await getAccoladeProgressForStudent(student.id);
  const xpHistory = await prisma.xpTransaction.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <AppShell title="Accolades" nav={COACH_NAV} navCompact mobileCoachChrome>
      <p className="mb-4 text-sm">
        <Link href={`/coach/students/${student.id}`} className="font-medium text-accent hover:underline">
          {student.firstName} {student.lastName}
        </Link>
      </p>
      <AccoladesBoard
        progress={progress}
        xpHistory={xpHistory}
        intro="The same accolade list this athlete sees, including locked badges and progress."
      />
    </AppShell>
  );
}
