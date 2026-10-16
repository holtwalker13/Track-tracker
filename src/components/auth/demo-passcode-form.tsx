"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { DEMO_PASSWORD } from "@/lib/tenants";

type DemoPasscodeFormProps = {
  mode: "admin" | "student";
  accountLabel: string;
  title: string;
  next?: string;
  error?: string;
  /** When set, show email + password sign-in (admin quick access). */
  adminEmail?: string;
};

export function DemoPasscodeForm({
  mode,
  accountLabel,
  title,
  next,
  error: initialError,
  adminEmail,
}: DemoPasscodeFormProps) {
  const passcodeDefault = DEMO_PASSWORD;
  const router = useRouter();
  const [passcode, setPasscode] = useState(passcodeDefault);
  const [password, setPassword] = useState(passcodeDefault);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError ?? "");

  async function submitPasscode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, passcode, next: next ?? "" }),
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        redirect?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error === "missing" ? "missing" : "1");
        return;
      }
      router.push(data.redirect ?? (mode === "admin" ? "/admin" : "/student"));
      router.refresh();
    } catch {
      setError("1");
    } finally {
      setBusy(false);
    }
  }

  async function submitAdminPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!adminEmail) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password, next: next ?? "" }),
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { redirect?: string };
      if (!res.ok) {
        setError("1");
        return;
      }
      router.push(data.redirect ?? "/admin");
      router.refresh();
    } catch {
      setError("1");
    } finally {
      setBusy(false);
    }
  }

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

          <form onSubmit={submitPasscode} className="mt-6 space-y-4">
            <label className="block text-sm">
              Passcode
              <input
                name="passcode"
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-3 font-mono"
                autoComplete="off"
              />
            </label>
            {error === "1" && <p className="text-sm text-red-400">Wrong passcode or password</p>}
            {error === "missing" && (
              <p className="text-sm text-amber-300">
                No {mode === "admin" ? "admin" : "student"} account found in the database yet. Seed
                or import a roster first.
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-accent py-3 font-semibold text-background disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Enter demo"}
            </button>
          </form>

          {mode === "admin" && adminEmail ? (
            <div className="mt-8 border-t border-card-border pt-6">
              <p className="text-xs uppercase tracking-widest text-muted">Or sign in with password</p>
              <form onSubmit={submitAdminPassword} className="mt-3 space-y-3">
                <label className="block text-sm">
                  Email
                  <input
                    readOnly
                    value={adminEmail}
                    className="mt-1 w-full rounded-lg border border-card-border bg-background/60 px-3 py-2 font-mono text-sm"
                  />
                </label>
                <label className="block text-sm">
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-3"
                    autoComplete="current-password"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-lg border border-card-border py-2.5 text-sm font-medium hover:border-accent/50 disabled:opacity-60"
                >
                  Sign in as admin
                </button>
              </form>
            </div>
          ) : null}

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
