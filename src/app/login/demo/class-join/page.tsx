import Link from "next/link";
import { Card } from "@/components/ui/card";
import { getDemoClassJoinLab } from "@/lib/demo/class-join-lab";
import { CLASS_JOIN_LAB_DEMO } from "@/lib/tenants";

export const dynamic = "force-dynamic";

export default async function DemoClassJoinLabPage() {
  const lab = await getDemoClassJoinLab();

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg space-y-4 p-6">
        <p className="text-xs uppercase tracking-widest text-accent">General Demo</p>
        <h1 className="text-2xl font-bold">Class join + email code lab</h1>
        {!lab ? (
          <p className="text-sm text-muted">
            Demo data is missing. Run <code className="text-xs">npm run db:seed</code> or{" "}
            <code className="text-xs">npm run db:ensure-class-join-lab</code>.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted">
              Use this link to walk through the production flow: roster email → 6-digit code →
              password. Student is not pre-registered; each run starts fresh unless you completed
              signup.
            </p>
            <dl className="space-y-2 rounded-lg border border-card-border bg-background/50 px-4 py-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Class</dt>
                <dd className="text-right font-semibold">{lab.className}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Roster email</dt>
                <dd className="font-mono text-right text-xs">{lab.rosterEmail}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Username</dt>
                <dd className="font-mono font-semibold">{lab.username}</dd>
              </div>
            </dl>
            <Link
              href={lab.joinPath}
              className="block w-full rounded-lg bg-accent py-3 text-center font-semibold text-background"
            >
              Open class join link
            </Link>
            <p className="text-xs text-muted">
              On Railway, set <code className="text-xs">CLASS_JOIN_DEMO_EMAIL</code> to your real
              inbox and run <code className="text-xs">db:ensure-class-join-lab</code> so codes go to
              an address Resend can deliver. Default seed uses{" "}
              {CLASS_JOIN_LAB_DEMO.rosterEmail} (local log only without Resend).
            </p>
          </>
        )}
        <p className="text-sm">
          <Link href="/login/demo/admin" className="text-accent hover:underline">
            Demo admin login
          </Link>{" "}
          → Resend smoke test on the admin home page.
        </p>
        <p className="text-sm">
          <Link href="/login" className="text-muted hover:text-foreground">
            Back to login
          </Link>
        </p>
      </Card>
    </div>
  );
}
