"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const urlError = searchParams.get("error");
  const [email, setEmail] = useState("coach1@jhs.demo");
  const [password, setPassword] = useState("rekcart");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <p className="text-xs uppercase tracking-widest text-accent">Measure → Compare → Improve</p>
        <h1 className="mt-2 text-2xl font-bold">Athletic Performance Platform</h1>
        <p className="mt-1 text-sm text-muted">Sign in as coach or student</p>
        <form method="POST" action="/api/auth/login" className="mt-6 space-y-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <label className="block text-sm">
            Email
            <input
              name="email"
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="block text-sm">
            Password
            <input
              name="password"
              type="password"
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-3"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {urlError && <p className="text-sm text-red-400">Invalid credentials</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-accent py-3 font-semibold text-background"
          >
            Sign in
          </button>
        </form>
        <p className="mt-4 text-xs text-muted">
          Demo: coach1@jhs.demo or student1@jhs.demo — rekcart
        </p>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-muted">Loading…</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
