import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getCategoryRadar } from "@/lib/queries/student";
import { RadarProfile } from "@/components/charts/radar-profile";
import { percentileForResult } from "@/lib/queries/benchmarks";
import type { ScoringDirection } from "@/lib/constants";

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) redirect("/login");
  const { id } = await params;

  const student = await prisma.studentProfile.findUnique({
    where: { id },
    include: {
      enrollments: {
        where: { schoolYear: { isCurrent: true } },
      },
    },
  });
  if (!student || student.schoolId !== session.schoolId) notFound();

  const grade = student.enrollments[0]?.gradeLevel ?? 8;
  const radar = await getCategoryRadar(id, grade);

  const results = await prisma.performanceResult.findMany({
    where: { studentId: id, status: "COMPLETED", isBestAttempt: true },
    include: { activity: true },
    orderBy: { testingDate: "desc" },
    take: 12,
  });

  const resultRows = await Promise.all(
    results.map(async (r) => {
      const pct =
        r.resultValue != null
          ? await percentileForResult(
              r.activityId,
              r.gradeLevel,
              r.resultValue,
              r.activity.scoringDirection as ScoringDirection
            )
          : null;
      return { r, pct };
    })
  );

  return (
    <AppShell title={`${student.firstName} ${student.lastName}`} nav={COACH_NAV}>
      <p className="text-muted">Grade {grade} · {student.studentNumber}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Athletic profile</CardTitle>
          <RadarProfile data={radar} />
        </Card>
        <Card>
          <CardTitle>Latest results</CardTitle>
          <ul className="mt-4 space-y-4">
            {resultRows.map(({ r, pct }) => (
              <li key={r.id} className="flex justify-between border-b border-card-border/40 pb-2">
                <span>{r.activity.name}</span>
                <span>
                  <span className="font-bold">{r.displayValue ?? r.resultValue}</span>
                  {pct != null && (
                    <span className="ml-2 text-sm text-accent">{pct}th %ile</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
