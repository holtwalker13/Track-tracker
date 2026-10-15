"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";

type Preview = {
  className: string;
  period: string | null;
  coachName: string;
  schoolName: string;
};

type Identity = {
  fullName: string;
  username: string;
  hasAccount: boolean;
};

export function ClassJoinForm({ token }: { token: string }) {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [credential, setCredential] = useState("");
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/class-join?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok) {
        setPreview(null);
        setError(data.error ?? "This class link is not valid.");
        return;
      }
      setPreview(data);
    } catch {
      setError("Could not open this class link.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function identify(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/class-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, credential, action: "identify" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setIdentity(null);
        setError(data.error ?? "That email is not on this class.");
        return;
      }
      setIdentity({
        fullName: data.fullName,
        username: data.username,
        hasAccount: Boolean(data.hasAccount),
      });
    } catch {
      setError("Could not check that email.");
    } finally {
      setPending(false);
    }
  }

  async function finish(event: React.FormEvent) {
    event.preventDefault();
    if (!identity) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/class-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          credential,
          action: identity.hasAccount ? "login" : "create",
          password,
          passwordConfirm,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not continue.");
        return;
      }
      router.replace(data.redirect ?? "/student");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted">Opening class…</div>;
  }

  if (!preview) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md p-6 text-center">
          <h1 className="text-xl font-bold">Class link not found</h1>
          <p className="mt-2 text-sm text-muted">{error ?? "Ask your coach for a new class QR code."}</p>
        </Card>
      </div>
    );
  }

  const classLabel = preview.period ? `${preview.period} · ${preview.className}` : preview.className;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <p className="text-xs uppercase tracking-widest text-accent">{preview.schoolName}</p>
        <h1 className="mt-2 text-2xl font-bold">{classLabel}</h1>
        <p className="mt-1 text-sm text-muted">
          You are opening {preview.coachName}&apos;s class. Enter your student email before you can
          log anything.
        </p>

        {!identity ? (
          <form onSubmit={identify} className="mt-6 space-y-4">
            <label className="block text-sm">
              Student email
              <input
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                autoComplete="username"
                placeholder="jsmith2028 or name@school.edu"
                required
                className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-3"
              />
            </label>
            <p className="text-xs text-muted">
              This has to match the email or username on the class roster.
            </p>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-accent py-3 font-semibold text-background disabled:opacity-60"
            >
              {pending ? "Checking…" : "Continue"}
            </button>
          </form>
        ) : (
          <form onSubmit={finish} className="mt-6 space-y-4">
            <dl className="space-y-2 rounded-lg border border-card-border bg-background/50 px-4 py-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Student</dt>
                <dd className="text-right font-semibold">{identity.fullName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Username</dt>
                <dd className="font-mono font-semibold">{identity.username}</dd>
              </div>
            </dl>
            <label className="block text-sm">
              {identity.hasAccount ? "Password" : "Create a password"}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={identity.hasAccount ? "current-password" : "new-password"}
                required
                className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-3"
              />
            </label>
            {!identity.hasAccount ? (
              <label className="block text-sm">
                Confirm password
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-3"
                />
              </label>
            ) : null}
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-accent py-3 font-semibold text-background disabled:opacity-60"
            >
              {pending
                ? "Working…"
                : identity.hasAccount
                  ? "Sign in"
                  : "Create account and sign in"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIdentity(null);
                setPassword("");
                setPasswordConfirm("");
                setError(null);
              }}
              className="text-sm text-muted hover:text-foreground"
            >
              Use a different email
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
