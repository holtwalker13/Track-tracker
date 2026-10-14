import { CredentialsLoginForm } from "@/components/auth/credentials-login-form";
import { LoginPageFooter } from "@/components/auth/login-page-footer";
import { Card } from "@/components/ui/card";

function LoginForm({ error, next }: { error?: string; next?: string }) {
  return (
    <div className="flex min-h-dvh flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex flex-1 items-center justify-center overflow-x-clip px-4 py-10">
        <Card className="w-full max-w-md">
          <p className="text-xs uppercase tracking-widest text-accent">Measure → Compare → Improve</p>
          <h1 className="mt-2 text-2xl font-bold">Athletic Performance Platform</h1>
          <p className="mt-1 text-sm text-muted">
            Students sign in with the username from your coach (usually first initial, last name, and
            graduating year, like{" "}
            <span className="font-mono text-foreground/90">jsmith2028</span>). Coaches use their school
            email. Use your setup link once to choose a password.
          </p>
          <CredentialsLoginForm error={error} next={next} />
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
