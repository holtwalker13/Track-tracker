"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";

type Preview = {
  fullName: string;
  username: string;
  schoolName: string;
  purpose?: "SETUP" | "RESET";
  canComplete?: boolean;
  alreadyActive?: boolean;
  expired?: boolean;
  used?: boolean;
};

export function StudentJoinForm({ token }: { token: string }) {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [confirmName, setConfirmName] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdLogin, setCreatedLogin] = useState<{ username: string; email: string } | null>(
    null
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/student-invite?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok) {
        setPreview(null);
        setError(data.error ?? "This link is not valid.");
        return;
      }
      setPreview(data);
    } catch {
      setError("Could not load this link. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/student-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, passwordConfirm, confirmName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create your account.");
        return;
      }
      if (data.username || data.email) {
        setCreatedLogin({
          username: String(data.username ?? preview?.username ?? ""),
          email: String(data.email ?? ""),
        });
        window.setTimeout(() => {
          router.replace(data.redirect ?? "/student");
          router.refresh();
        }, 4500);
        return;
      }
      router.replace(data.redirect ?? "/student");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (createdLogin && preview) {
    const signInUsername = createdLogin.username || preview.username;
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md p-6 text-center">
          <h1 className="text-xl font-bold">You&apos;re all set</h1>
          <p className="mt-2 text-sm text-muted">
            On this phone or a computer, open the sign-in page and use username{" "}
            <span className="font-mono font-semibold text-foreground">{signInUsername}</span> with the
            password you just chose.
          </p>
          <p className="mt-4 text-sm text-muted">Opening your dashboard…</p>
          <a
            href="/login"
            className="mt-6 inline-block text-sm text-accent underline underline-offset-2"
          >
            Go to sign in on another device
          </a>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        Loading your invite…
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md p-6 text-center">
          <h1 className="text-xl font-bold">Link not found</h1>
          <p className="mt-2 text-sm text-muted">{error ?? "Ask your coach to send a new login link."}</p>
        </Card>
      </div>
    );
  }

  if (preview.alreadyActive && preview.purpose !== "RESET") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md p-6">
          <h1 className="text-xl font-bold">Account already set up</h1>
          <p className="mt-2 text-sm text-muted">
            {preview.fullName} ({preview.username}) already has a login. Use the sign-in page on this device.
          </p>
          <a
            href="/login"
            className="mt-6 inline-block w-full rounded-lg bg-accent py-3 text-center font-semibold text-background"
          >
            Go to sign in
          </a>
        </Card>
      </div>
    );
  }

  if (preview.used || preview.expired || preview.canComplete === false) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md p-6">
          <h1 className="text-xl font-bold">Link unavailable</h1>
          <p className="mt-2 text-sm text-muted">
            {preview.used
              ? "This link was already used."
              : "This link has expired."}{" "}
            Ask your coach to copy a fresh login link from the roster.
          </p>
        </Card>
      </div>
    );
  }

  const isReset = preview.purpose === "RESET";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <p className="text-xs uppercase tracking-widest text-accent">{preview.schoolName}</p>
        <h1 className="mt-2 text-2xl font-bold">{isReset ? "Set a new password" : "Create your login"}</h1>
        <p className="mt-1 text-sm text-muted">
          {isReset
            ? "Confirm your roster info, then choose a new password. Your old password will stop working."
            : "Confirm your roster info, then choose a password only you should know."}
        </p>

        <dl className="mt-6 space-y-3 rounded-lg border border-card-border bg-background/50 px-4 py-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Name</dt>
            <dd className="font-semibold text-right">{preview.fullName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Username</dt>
            <dd className="font-mono font-semibold">{preview.username}</dd>
          </div>
        </dl>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={confirmName}
              onChange={(e) => setConfirmName(e.target.checked)}
              className="mt-1"
              required
            />
            <span>
              I confirm this is my name and student username on the roster.
            </span>
          </label>

          <label className="block text-sm">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-3"
            />
          </label>
          <label className="block text-sm">
            Confirm password
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-3"
            />
          </label>
          <p className="text-xs text-muted">
            Use at least 8 characters with letters and numbers. Do not share your password.
          </p>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !confirmName}
            className="w-full rounded-lg bg-accent py-3 font-semibold text-background disabled:opacity-60"
          >
            {submitting
              ? isReset
                ? "Updating password…"
                : "Creating account…"
              : isReset
                ? "Update password & sign in"
                : "Create account & sign in"}
          </button>
        </form>
      </Card>
    </div>
  );
}
