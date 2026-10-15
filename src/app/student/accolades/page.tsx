import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AccoladesBoard } from "@/components/gamification/accolades-board";
import { STUDENT_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { getAccoladeProgressForStudent } from "@/lib/gamification/engine";
import { ensureAccoladeDefinitions } from "@/lib/gamification/seed-accolades";
import { prisma } from "@/lib/db";

export default async function StudentAccoladesPage() {
  const session = await requireSession(["STUDENT"]);
  if (!session?.studentId) redirect("/login");

  await ensureAccoladeDefinitions();
  const progress = await getAccoladeProgressForStudent(session.studentId);
  const xpHistory = await prisma.xpTransaction.findMany({
    where: { studentId: session.studentId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <AppShell title="Accolades" nav={STUDENT_NAV}>
      <AccoladesBoard
        progress={progress}
        xpHistory={xpHistory}
        intro="Earn badges for consistency, PRs, strength milestones, and more. Locked accolades show your progress."
      />
    </AppShell>
  );
}
