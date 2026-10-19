import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { CoachPerformanceDashboard } from "@/components/admin/coach-performance-dashboard";
import { ADMIN_NAV } from "@/lib/navigation";
import { requireSession } from "@/lib/auth/session";
import { getDistrictCoachPerformance } from "@/lib/queries/admin-coach-performance";

export default async function AdminCoachPerformancePage() {
  const session = await requireSession(["ADMIN"]);
  if (!session) redirect("/login");

  const data = await getDistrictCoachPerformance();

  return (
    <AppShell title="Coach performance" nav={ADMIN_NAV}>
      <p className="mb-4 text-sm text-muted">
        <Link href="/admin" className="text-accent hover:underline">
          ← App admin
        </Link>
      </p>
      {!data || data.metrics.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-card-border p-8 text-center">
          <h2 className="text-lg font-semibold">No PE performance data yet</h2>
          <p className="mt-2 text-sm text-muted">
            Seed demo district marks, then refresh this page.
          </p>
          <pre className="mx-auto mt-4 max-w-md rounded-lg bg-card p-3 text-left text-xs">
            npm run db:seed-pe-performance
          </pre>
        </div>
      ) : (
        <CoachPerformanceDashboard data={data} />
      )}
    </AppShell>
  );
}
