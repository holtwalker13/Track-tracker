import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { loginAction } from "./actions";
import { LoginPageFooter } from "@/components/auth/login-page-footer";

function LoginForm({ error, next }: { error?: string; next?: string }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md">
          <p className="text-xs uppercase tracking-widest text-accent">Measure → Compare → Improve</p>
          <h1 className="mt-2 text-2xl font-bold">Athletic Performance Platform</h1>
          <p className="mt-1 text-sm text-muted">
            Students sign in with the username from your coach (usually first initial, last name, and
            graduating year, like{" "}
            <span className="font-mono text-foreground/90">jsmith2028</span>). Coaches use their school
            email. Use your setup link once to choose a password.
          </p>

          <form action={loginAction} className="mt-6 space-y-4">
            {next ? <input type="hidden" name="next" value={next} /> : null}
            <label className="block text-sm">
              Username or email
              <input
                name="email"
                placeholder="jsmith2028"
                className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-3 font-mono"
                autoComplete="username"
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
        </Card>
      </div>
      <LoginPageFooter next={next} />
    </div>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const sp = await searchParams;
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-muted">Loading…</div>
      }
    >
      <LoginForm error={sp.error} next={sp.next} />
    </Suspense>
  );
}
