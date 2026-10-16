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
            Students who already have an account can still sign in with their username. Track Tracker is
            switching to school email and the same password. New students use the email on the roster.
            Coaches use their school email.
          </p>

          <form action={loginAction} className="mt-6 space-y-4">
            {next ? <input type="hidden" name="next" value={next} /> : null}
            <label className="block text-sm">
              Username or school email
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
                Use the account link or class QR from your coach to create your password first.
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
  return <LoginForm error={sp.error} next={sp.next} />;
}
