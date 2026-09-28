import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { loginAction } from "./actions";
import { TenantLoginCards } from "@/components/auth/tenant-login-cards";
import type { TenantLoginInfo } from "@/lib/queries/tenant-login";
import { DEMO_CLASS_LOGIN } from "@/lib/tenants";

function LoginForm({
  error,
  next,
  tenantLogin,
}: {
  error?: string;
  next?: string;
  tenantLogin: TenantLoginInfo[];
}) {
  const studentEmailsBySlug = Object.fromEntries(
    tenantLogin.map((t) => [t.slug, t.studentEmail])
  ) as Partial<Record<string, string | null>>;
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-3xl">
        <p className="text-xs uppercase tracking-widest text-accent">Measure → Compare → Improve</p>
        <h1 className="mt-2 text-2xl font-bold">Athletic Performance Platform</h1>
        <p className="mt-1 text-sm text-muted">Sign in with email, or pick a school system below.</p>
        <form action={loginAction} className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-card-border bg-background/40 px-3 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">{DEMO_CLASS_LOGIN.displayName}</span>
          <input type="hidden" name="email" value={DEMO_CLASS_LOGIN.username} />
          <input type="hidden" name="password" value={DEMO_CLASS_LOGIN.password} />
          <button
            type="submit"
            className="rounded-lg border border-sky-400/40 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/20"
          >
            Sign in as demo ({DEMO_CLASS_LOGIN.username})
          </button>
          <span className="text-[11px] text-muted">or use the form below</span>
        </form>

        <form action={loginAction} className="mt-6 space-y-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <label className="block text-sm">
            Email
            <input
              name="email"
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-3"
              autoComplete="email"
            />
          </label>
          <label className="block text-sm">
            Password
            <input
              name="password"
              type="password"
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-3"
              autoComplete="current-password"
            />
          </label>
          {error === "setup" && (
            <p className="text-sm text-amber-300">
              Use the setup link or QR code from your coach or admin to create your password first.
            </p>
          )}
          {error && error !== "setup" && <p className="text-sm text-red-400">Invalid credentials</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-accent py-3 font-semibold text-background"
          >
            Sign in
          </button>
        </form>
        <TenantLoginCards studentEmailsBySlug={studentEmailsBySlug} />
      </Card>
    </div>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const { getTenantLoginInfo } = await import("@/lib/queries/tenant-login");
  const tenantLogin = await getTenantLoginInfo();
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-muted">Loading…</div>
      }
    >
      <LoginForm error={sp.error} next={sp.next} tenantLogin={tenantLogin} />
    </Suspense>
  );
}
