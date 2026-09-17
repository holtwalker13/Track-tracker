import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { COACH_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { ensureSchoolKpiTargets } from "@/lib/queries/kpi";
import { prisma } from "@/lib/db";
import { KpiTargetsEditor, type TargetCell } from "@/components/kpi/kpi-targets-editor";
import { KPI_METRIC_META, MEDALS, type Medal } from "@/lib/kpi-targets";

export default async function BenchmarksPage() {
  const session = await requireSession(["COACH", "ADMIN"]);
  if (!session?.schoolId) redirect("/login");

  await ensureSchoolKpiTargets(session.schoolId);
  const rows = await prisma.schoolKpiTarget.findMany({
    where: { schoolId: session.schoolId },
  });
  const initial: TargetCell[] = rows
    .filter((r) => MEDALS.includes(r.medal as Medal) && KPI_METRIC_META.some((m) => m.slug === r.metricSlug))
    .map((r) => ({
      gender: r.gender === "M" ? "M" : "F",
      medal: r.medal as Medal,
      metricSlug: r.metricSlug,
      target: r.target,
    }));

  return (
    <AppShell title="Medal targets" nav={COACH_NAV}>
      <KpiTargetsEditor initial={initial} />
    </AppShell>
  );
}
