"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";

type Preview = {
  fullName: string;
  username: string;
  schoolName: string;
  purpose?: "SETUP" | "RESET" | "ACCOUNT";
  mode?: "LOGIN" | "CREATE";
  canComplete?: boolean;
  alreadyActive?: boolean;
  expired?: boolean;
  used?: boolean;
  deliveryEmail?: string;
  emailVerified?: boolean;
  pendingCode?: boolean;
};

type SetupStep = "code" | "password";

export function StudentJoinForm({ token }: { token: string }) {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupStep, setSetupStep] = useState<SetupStep>("code");
  const [deliveryEmail, setDeliveryEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [confirmName, setConfirmName] = useState(false);
  const [signInPassword, setSignInPassword] = useState("");
  const [replacePassword, setReplacePassword] = useState(false);
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
      if (typeof data.deliveryEmail === "string") setDeliveryEmail(data.deliveryEmail);
    } catch {
      setError("Could not load this link. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const startVerification = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/student-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "start" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not send a verification code.");
        return;
      }
      if (typeof data.email === "string") setDeliveryEmail(data.email);
      setSetupStep("code");
    } catch {
      setError("Could not send a verification code.");
    } finally {
      setSubmitting(false);
    }
  }, [token]);

  useEffect(() => {
    if (!preview || preview.mode !== "CREATE" || preview.canComplete === false) return;
    if (preview.emailVerified) {
      setSetupStep("password");
      return;
    }
    if (preview.pendingCode) {
      setSetupStep("code");
      return;
    }
    void startVerification();
  }, [preview, startVerification]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/student-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, passwordConfirm, confirmName, action: "complete" }),
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

  async function confirmCode(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/student-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "verify", code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "That code does not match.");
        return;
      }
      setCode("");
      setSetupStep("password");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resendCode() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/student-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "resend" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not send a new code.");
        return;
      }
      setCode("");
    } catch {
      setError("Could not send a new code.");
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
          <p className="mt-2 text-sm text-muted">{error ?? "Ask your coach to send a new account link."}</p>
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
            Ask your coach to copy a fresh account link from the roster.
          </p>
        </Card>
      </div>
    );
  }

  const signingIn = preview.mode === "LOGIN" || preview.alreadyActive;
  const creatingAccount = preview.mode === "CREATE" && !signingIn;

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: preview?.username,
          password: signInPassword,
          next: "/student",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "That password does not match this account.");
        return;
      }
      router.replace(typeof data.redirect === "string" ? data.redirect : "/student");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (signingIn && !replacePassword) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md">
          <p className="text-xs uppercase tracking-widest text-accent">{preview.schoolName}</p>
          <h1 className="mt-2 text-2xl font-bold">Sign in</h1>
          <p className="mt-1 text-sm text-muted">
            {preview.fullName} already has an account. Sign in to open your dashboard.
          </p>
          <dl className="mt-6 space-y-3 rounded-lg border border-card-border bg-background/50 px-4 py-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Name</dt>
              <dd className="text-right font-semibold">{preview.fullName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Username</dt>
              <dd className="font-mono font-semibold">{preview.username}</dd>
            </div>
          </dl>
          <form onSubmit={signIn} className="mt-6 space-y-4">
            <label className="block text-sm">
              Password
              <input
                type="password"
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-3"
              />
            </label>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-accent py-3 font-semibold text-background disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setReplacePassword(true);
            }}
            className="mt-4 text-sm text-accent hover:underline"
          >
            Set a new password
          </button>
        </Card>
      </div>
    );
  }

  const studentCard = (
    <dl className="mt-6 space-y-3 rounded-lg border border-card-border bg-background/50 px-4 py-3 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-muted">Name</dt>
        <dd className="text-right font-semibold">{preview.fullName}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted">Username</dt>
        <dd className="font-mono font-semibold">{preview.username}</dd>
      </div>
    </dl>
  );

  if (creatingAccount && setupStep === "code") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md">
          <p className="text-xs uppercase tracking-widest text-accent">{preview.schoolName}</p>
          <h1 className="mt-2 text-2xl font-bold">Confirm your email</h1>
          <p className="mt-1 text-sm text-muted">
            We emailed a 6-digit code to the address on your roster. Enter it to continue setup.
          </p>
          {studentCard}
          <form onSubmit={confirmCode} className="mt-6 space-y-4">
            <p className="text-sm text-muted">
              Code sent to{" "}
              <span className="font-semibold text-foreground">{deliveryEmail || preview.deliveryEmail}</span>
            </p>
            <label className="block text-sm">
              Verification code
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                required
                className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-3 text-center font-mono text-lg tracking-[0.4em]"
              />
            </label>
            {error && <p className="text-sm text-red-400">{error}</p>}
            {submitting && !code ? (
              <p className="text-sm text-muted">Sending verification code…</p>
            ) : null}
            <button
              type="submit"
              disabled={submitting || code.length !== 6}
              className="w-full rounded-lg bg-accent py-3 font-semibold text-background disabled:opacity-60"
            >
              {submitting ? "Checking…" : "Verify email"}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void resendCode()}
              className="text-sm text-muted hover:text-foreground"
            >
              Resend code
            </button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <p className="text-xs uppercase tracking-widest text-accent">{preview.schoolName}</p>
        <h1 className="mt-2 text-2xl font-bold">{signingIn ? "Set a new password" : "Create your account"}</h1>
        <p className="mt-1 text-sm text-muted">
          {signingIn
            ? "Confirm your name, then choose a new password. Your old password will stop working."
            : "Email confirmed. Confirm your name, then choose a password only you should know."}
        </p>

        {studentCard}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={confirmName}
              onChange={(e) => setConfirmName(e.target.checked)}
              className="mt-1"
              required
            />
            <span>I confirm this is my name and student username on the roster.</span>
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
              ? signingIn
                ? "Updating password…"
                : "Creating account…"
              : signingIn
                ? "Update password and sign in"
                : "Create account and sign in"}
          </button>
        </form>
      </Card>
    </div>
  );
}
