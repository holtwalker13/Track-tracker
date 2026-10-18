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
};

type Step = "email" | "code" | "password" | "login";

export function ClassJoinForm({ token }: { token: string }) {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [credential, setCredential] = useState("");
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [step, setStep] = useState<Step>("email");
  const [deliveryEmail, setDeliveryEmail] = useState("");
  const [code, setCode] = useState("");
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

  function applyIdentity(data: {
    fullName: string;
    username: string;
    email?: string;
    step?: string;
  }) {
    setIdentity({ fullName: data.fullName, username: data.username });
    if (typeof data.email === "string") setDeliveryEmail(data.email);
    const next =
      data.step === "login" || data.step === "password" || data.step === "code" ? data.step : "code";
    setStep(next);
  }

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
      applyIdentity(data);
    } catch {
      setError("Could not check that email.");
    } finally {
      setPending(false);
    }
  }

  async function finish(event: React.FormEvent) {
    event.preventDefault();
    if (!identity || (step !== "password" && step !== "login")) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/class-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          credential,
          action: step === "login" ? "login" : "create",
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

  async function confirmCode(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/class-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, credential, action: "verify", code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "That code does not match.");
        return;
      }
      setCode("");
      setPassword("");
      setPasswordConfirm("");
      setStep("password");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function resendCode() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/class-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, credential, action: "resend" }),
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

        {step === "email" ? (
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
              This has to match the email or username on the class roster. We email a 6-digit code to
              confirm it&apos;s you.
            </p>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-accent py-3 font-semibold text-background disabled:opacity-60"
            >
              {pending ? "Sending code…" : "Continue"}
            </button>
          </form>
        ) : step === "code" ? (
          <form onSubmit={confirmCode} className="mt-6 space-y-4">
            {identity ? (
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
            ) : null}
            <p className="text-sm text-muted">
              We sent a 6-digit code to{" "}
              <span className="font-semibold text-foreground">{deliveryEmail}</span>. Enter it below
              to confirm your email.
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
            <button
              type="submit"
              disabled={pending || code.length !== 6}
              className="w-full rounded-lg bg-accent py-3 font-semibold text-background disabled:opacity-60"
            >
              {pending ? "Checking…" : "Verify email"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => void resendCode()}
              className="text-sm text-muted hover:text-foreground"
            >
              Resend code
            </button>
            <button
              type="button"
              onClick={() => {
                setIdentity(null);
                setStep("email");
                setCode("");
                setError(null);
              }}
              className="block text-sm text-muted hover:text-foreground"
            >
              Use a different email
            </button>
          </form>
        ) : (
          <form onSubmit={finish} className="mt-6 space-y-4">
            <dl className="space-y-2 rounded-lg border border-card-border bg-background/50 px-4 py-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Student</dt>
                <dd className="text-right font-semibold">{identity?.fullName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Username</dt>
                <dd className="font-mono font-semibold">{identity?.username}</dd>
              </div>
            </dl>
            {step === "password" ? (
              <p className="text-sm text-muted">
                Email confirmed. Create a password to finish your account.
              </p>
            ) : null}
            <label className="block text-sm">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={step === "login" ? "current-password" : "new-password"}
                required
                className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-3"
              />
            </label>
            {step === "password" ? (
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
              {pending ? "Working…" : step === "login" ? "Sign in" : "Create account"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIdentity(null);
                setStep("email");
                setPassword("");
                setPasswordConfirm("");
                setCode("");
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
