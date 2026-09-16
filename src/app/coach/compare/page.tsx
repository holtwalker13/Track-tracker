import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { percentileForResult } from "@/lib/queries/benchmarks";
import type { ScoringDirection } from "@/lib/constants";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string; activity?: string }>;
}) {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) redirect("/login");
  const sp = await searchParams;
  const activitySlug = sp.activity ?? "vertical-jump";

  const students = await prisma.studentProfile.findMany({
    where: { schoolId: session.schoolId },
    take: 50,
    orderBy: { lastName: "asc" },
  });

  const activity = await prisma.activity.findUniqueOrThrow({
    where: { slug: activitySlug },
  });

  async function bestFor(studentId: string) {
    const r = await prisma.performanceResult.findFirst({
      where: {
        studentId,
        activityId: activity.id,
        status: "COMPLETED",
        isBestAttempt: true,
      },
      orderBy: { testingDate: "desc" },
    });
    return r?.resultValue ?? null;
  }

  const studentA = sp.a ? students.find((s) => s.id === sp.a) : students[0];
  const studentB = sp.b ? students.find((s) => s.id === sp.b) : students[1];

  const [valA, valB] = studentA && studentB
    ? await Promise.all([bestFor(studentA.id), bestFor(studentB.id)])
    : [null, null];

  const grade = 8;
  const bench = await prisma.benchmarkValue.findFirst({
    where: { activityId: activity.id, gradeLevel: grade },
  });

  const allResults = await prisma.performanceResult.findMany({
    where: {
      schoolId: session.schoolId,
      activityId: activity.id,
      status: "COMPLETED",
      isBestAttempt: true,
      gradeLevel: grade,
      resultValue: { not: null },
    },
  });
  const avg =
    allResults.length > 0
      ? allResults.reduce((s, r) => s + (r.resultValue ?? 0), 0) / allResults.length
      : null;

  const pctA =
    valA != null
      ? await percentileForResult(
          activity.id,
          grade,
          valA,
          activity.scoringDirection as ScoringDirection
        )
      : null;

  return (
    <AppShell title="Compare" nav={COACH_NAV}>
      <form className="mb-6 flex flex-wrap gap-2">
        <select name="a" defaultValue={studentA?.id} className="rounded-lg border border-card-border bg-background px-2 py-2">
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
          ))}
        </select>
        <select name="b" defaultValue={studentB?.id} className="rounded-lg border border-card-border bg-background px-2 py-2">
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
          ))}
        </select>
        <select name="activity" defaultValue={activitySlug} className="rounded-lg border border-card-border bg-background px-2 py-2">
          <option value="vertical-jump">Vertical Jump</option>
          <option value="standing-broad-jump">Broad Jump</option>
          <option value="pull-ups">Pull-Ups</option>
        </select>
        <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-background">Compare</button>
      </form>
      <Card>
        <CardTitle>{activity.name}</CardTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          {[
            { label: studentA ? `${studentA.firstName}` : "A", value: valA },
            { label: studentB ? `${studentB.firstName}` : "B", value: valB },
            { label: `Grade ${grade} avg`, value: avg },
            { label: "Benchmark (P50)", value: bench?.p50 ?? null },
          ].map((col) => (
            <div key={col.label} className="rounded-lg bg-background/50 p-4 text-center">
              <p className="text-xs text-muted">{col.label}</p>
              <p className="mt-2 text-3xl font-bold text-accent">
                {col.value != null ? col.value.toFixed(1) : "—"}
              </p>
              {col.value != null && studentA && col.label === studentA.firstName && pctA != null && (
                <p className="mt-1 text-xs text-muted">{pctA}th %ile</p>
              )}
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
