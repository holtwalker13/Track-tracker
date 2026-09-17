import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { STUDENT_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { getStudentContext, getStudentScorecard } from "@/lib/queries/student";
import { prisma } from "@/lib/db";

export default async function StudentComparePage() {
  const session = await requireSession(["STUDENT"]);
  if (!session?.studentId) redirect("/login");

  const { currentGrade, student } = await getStudentContext(session.studentId);
  const scorecard = await getStudentScorecard(session.studentId, currentGrade);
  const vj = scorecard.find((c) => c.activity.slug === "vertical-jump");

  const bench = vj
    ? await prisma.benchmarkValue.findFirst({
        where: { activityId: vj.activity.id, gradeLevel: currentGrade },
      })
    : null;

  const gradeAvg = vj
    ? await prisma.performanceResult.aggregate({
        where: {
          schoolId: student.schoolId,
          activityId: vj.activity.id,
          gradeLevel: currentGrade,
          status: "COMPLETED",
          isBestAttempt: true,
        },
        _avg: { resultValue: true },
      })
    : null;

  return (
    <AppShell title="Compare" nav={STUDENT_NAV}>
      <Card>
        <CardTitle>Vertical jump — you vs peers & benchmark</CardTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-background/40 p-4 text-center">
            <p className="text-xs text-muted">You</p>
            <p className="text-3xl font-bold">{vj?.display ?? "—"}</p>
            {vj?.percentile != null && (
              <p className="text-sm text-accent">{vj.percentile}th percentile</p>
            )}
          </div>
          <div className="rounded-lg bg-background/40 p-4 text-center">
            <p className="text-xs text-muted">Grade average</p>
            <p className="text-3xl font-bold">
              {gradeAvg?._avg.resultValue?.toFixed(1) ?? "—"}
            </p>
          </div>
          <div className="rounded-lg bg-background/40 p-4 text-center">
            <p className="text-xs text-muted">National benchmark (P50)</p>
            <p className="text-3xl font-bold">{bench?.p50?.toFixed(1) ?? "—"}</p>
            <p className="text-xs text-warning">Synthetic dev data</p>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
