import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { STUDENT_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import {
  getStudentClassTags,
  getStudentPeerLeaders,
  getStudentSprintPotential,
} from "@/lib/queries/kpi";
import { SprintPotentialCard } from "@/components/performance/sprint-potential";
import { MedalScopeControls } from "@/components/performance/medal-scope-controls";
import { PeerLeadersCard } from "@/components/performance/peer-leaders-card";
import { formatActivityValue } from "@/lib/format";
import { KPI_METRIC_META, MEDAL_LABELS } from "@/lib/kpi-targets";
import { getStudentContext } from "@/lib/queries/student";
import { prisma } from "@/lib/db";
import { ageBracketForClassYear, isAgeBracketId } from "@/lib/age-brackets";

export default async function ProjectionPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; bracket?: string; window?: string }>;
}) {
  const session = await requireSession(["STUDENT"]);
  if (!session?.studentId) redirect("/login");

  const sp = await searchParams;
  const window = sp.window === "week" ? "week" : "all";
  const classId = sp.classId?.trim() || null;

  const { currentGrade, student } = await getStudentContext(session.studentId);
  const schoolYear = await prisma.schoolYear.findFirst({
    where: { schoolId: student.schoolId, isCurrent: true },
    select: { endDate: true },
  });
  const schoolYearEnd = schoolYear?.endDate?.getFullYear() ?? new Date().getFullYear();
  const defaultBracket = ageBracketForClassYear(currentGrade, schoolYearEnd);
  const bracket =
    sp.bracket && isAgeBracketId(sp.bracket) ? sp.bracket : defaultBracket;

  const potential = await getStudentSprintPotential(session.studentId, {
    ageBracket: bracket,
    window,
  });
  const classTags = await getStudentClassTags(session.studentId);
  const peerLeaders = await getStudentPeerLeaders(session.studentId, {
    ageBracket: bracket,
    window,
    classId,
  });
  const next = potential.next;

  return (
    <AppShell title="Projection" nav={STUDENT_NAV}>
      <p className="mb-4 text-sm text-muted">
        These are this school’s Gold / Silver / Bronze training targets, not a race prediction.
      </p>
      <MedalScopeControls classes={classTags} defaultBracket={defaultBracket} />
      <SprintPotentialCard potential={potential} />
      <PeerLeadersCard
        leaders={peerLeaders}
        windowLabel={window === "week" ? "This week" : "All-time"}
      />
      {next && (
        <Card className="mt-6">
          <CardTitle>Gaps to {MEDAL_LABELS[next.band.medal]}</CardTitle>
          <ul className="mt-4 space-y-2 text-sm">
            {next.rows.map((row) => {
              const meta = KPI_METRIC_META.find((m) => m.slug === row.slug)!;
              if (row.athlete == null) {
                return (
                  <li key={row.slug} className="flex justify-between text-muted">
                    <span>{row.name}</span>
                    <span>not tested</span>
                  </li>
                );
              }
              const gap =
                row.direction === "HIGHER_BETTER"
                  ? row.target - row.athlete
                  : row.athlete - row.target;
              return (
                <li key={row.slug} className="flex justify-between">
                  <span>{row.name}</span>
                  <span className="tabular-nums">
                    {row.hit
                      ? "on target"
                      : `${formatActivityValue(Math.abs(gap), meta.unit, row.slug)} to go`}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </AppShell>
  );
}
