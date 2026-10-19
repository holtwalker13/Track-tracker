import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { CoachPerformanceDashboard } from "@/components/admin/coach-performance-dashboard";
import { ADMIN_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import {
  getDistrictCoachPerformance,
  getDistrictReportMetricCatalog,
  resolveDistrictReportMetricSlugs,
} from "@/lib/queries/admin-coach-performance";

export default async function AdminCoachPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ metrics?: string }>;
}) {
  const session = await requireSession(["ADMIN"]);
  if (!session) redirect("/login");

  const sp = await searchParams;
  const catalog = await getDistrictReportMetricCatalog();
  const metricSlugs = resolveDistrictReportMetricSlugs(
    sp.metrics,
    catalog.map((c) => c.slug)
  );
  const data = await getDistrictCoachPerformance(metricSlugs);

  return (
    <AppShell title="Coach performance" nav={ADMIN_NAV}>
      <p className="mb-4 text-sm text-muted">
        <Link href="/admin" className="text-accent hover:underline">
          ← App admin
        </Link>
      </p>
      <Suspense fallback={<p className="text-sm text-muted">Loading report…</p>}>
        <CoachPerformanceDashboard
          data={data}
          metricCatalog={catalog}
          selectedMetricSlugs={metricSlugs}
        />
      </Suspense>
    </AppShell>
  );
}
