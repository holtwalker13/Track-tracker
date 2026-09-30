import Link from "next/link";
import { Card } from "@/components/ui/card";
import { demoPasscodeLoginAction } from "@/app/login/demo/actions";
import { DEMO_PASSWORD } from "@/lib/tenants";

type DemoPasscodeFormProps = {
  mode: "admin" | "student";
  accountLabel: string;
  title: string;
  next?: string;
  error?: string;
};

export function DemoPasscodeForm({ mode, accountLabel, title, next, error }: DemoPasscodeFormProps) {
  const passcodeDefault = process.env.DEMO_PASSWORD || DEMO_PASSWORD;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md">
          <p className="text-xs uppercase tracking-widest text-accent">Demo access</p>
          <h1 className="mt-2 text-2xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-muted">
            Account:{" "}
            <span className="font-mono text-foreground/90">{accountLabel}</span>
          </p>

          <form action={demoPasscodeLoginAction} className="mt-6 space-y-4">
            <input type="hidden" name="mode" value={mode} />
            {next ? <input type="hidden" name="next" value={next} /> : null}
            <label className="block text-sm">
              Passcode
              <input
                name="passcode"
                type="password"
                defaultValue={passcodeDefault}
                className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-3 font-mono"
                autoComplete="off"
              />
            </label>
            {error === "1" && <p className="text-sm text-red-400">Wrong passcode</p>}
            {error === "missing" && (
              <p className="text-sm text-amber-300">
                No {mode === "admin" ? "admin" : "student"} account found in the database yet. Seed
                or import a roster first.
              </p>
            )}
            <button
              type="submit"
              className="w-full rounded-lg bg-accent py-3 font-semibold text-background"
            >
              Enter demo
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-muted">
            <Link href="/login" className="underline underline-offset-2 hover:text-foreground">
              Back to sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
