import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { STUDENT_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import {
  getStudentContext,
  getStudentScorecard,
  getCategoryRadar,
} from "@/lib/queries/student";
import { RadarProfile } from "@/components/charts/radar-profile";
import { prisma } from "@/lib/db";
import { getStudentLeaderboard } from "@/lib/queries/leaderboard-student";
import { genderFullLabel } from "@/lib/gender";
import { classYearLabel } from "@/lib/grades";
import { getStudentSprintPotential } from "@/lib/queries/kpi";
import { SprintPotentialCard } from "@/components/performance/sprint-potential";
import { ProfileBanner } from "@/components/layout/profile-banner";
import { getStudentActivityRanks } from "@/lib/queries/coach";
import { KPI_METRIC_META } from "@/lib/kpi-targets";
import { leaderboardHighlightFromSearch } from "@/lib/leaderboard-link";

export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ lb?: string; rank?: string; scope?: string }>;
}) {
  const session = await requireSession(["STUDENT"]);
  if (!session?.studentId) redirect("/login");
  const studentId = session.studentId;
  const sp = await searchParams;
  const highlight = leaderboardHighlightFromSearch(sp);

  const { student, currentGrade } = await getStudentContext(studentId);
  const scorecard = await getStudentScorecard(studentId, currentGrade);
  const radar = await getCategoryRadar(studentId, currentGrade);

  const prs = await prisma.performanceResult.findMany({
    where: {
      studentId,
      isPersonalRecord: true,
      status: "COMPLETED",
      isBestAttempt: true,
    },
    include: { activity: true },
    orderBy: { testingDate: "desc" },
    take: 4,
  });

  const schoolId = student.schoolId;
  const ranks = await Promise.all(
    ["vertical-jump", "standing-broad-jump", "40-yard-dash"].map(async (slug) => {
      const lb = await getStudentLeaderboard(
        schoolId,
        slug,
        studentId,
        currentGrade
      );
      const me = lb.entries.find((e) => e.displayName === "You");
      return {
        activity: lb.activity.name,
        rank: me?.rank,
        total: lb.entries.length,
      };
    })
  );

  const sprint = await getStudentSprintPotential(studentId);
  const kpiRanks = await getStudentActivityRanks(
    schoolId,
    studentId,
    KPI_METRIC_META.map((m) => m.slug),
    {
      gender: student.gender ?? undefined,
      scope: "school",
    }
  );

  return (
    <AppShell title="Dashboard" nav={STUDENT_NAV}>
      <ProfileBanner
        name={`${student.firstName} ${student.lastName}`}
        meta={`${classYearLabel(currentGrade)} · ${genderFullLabel(student.gender)}`}
        seed={student.id}
      />

      <div>
        <SprintPotentialCard
          potential={sprint}
          ranks={kpiRanks}
          highlightSlug={highlight?.slug}
        />
      </div>

      <Card className="mt-6">
        <CardTitle>Category strengths</CardTitle>
        <RadarProfile data={radar} />
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {scorecard.map((c) => (
          <Card key={c.activity.id}>
            <CardTitle>{c.activity.name}</CardTitle>
            <p className="mt-2 text-4xl font-bold">{c.display}</p>
            {c.percentile != null && (
              <p className="text-accent">{c.percentile}th percentile</p>
            )}
            {c.yoy && <p className="text-sm text-muted">{c.yoy}</p>}
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardTitle>Latest personal records</CardTitle>
        <ul className="mt-4 space-y-2">
          {prs.map((p) => (
            <li key={p.id} className="flex justify-between">
              <span>{p.activity.name}</span>
              <span className="font-bold text-success">{p.displayValue}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-6">
        <CardTitle>{classYearLabel(currentGrade)} ranking</CardTitle>
        <ul className="mt-4 space-y-2">
          {ranks.map((r) => (
            <li key={r.activity} className="flex justify-between text-sm">
              <span>{r.activity}</span>
              <span>
                {r.rank != null ? `#${r.rank} of ${r.total}` : "—"}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </AppShell>
  );
}
