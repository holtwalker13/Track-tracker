"use client";

import { useState, type FormEvent } from "react";
import { requestJson } from "@/lib/client-save";

export function CredentialsLoginForm({
  error,
  next,
}: {
  error?: string;
  next?: string;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const result = await requestJson(
      "/api/auth/login",
      {
        method: "POST",
        body: {
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
          next: next || undefined,
        },
      },
      { redirectOnUnauthorized: false }
    );
    if (!result.ok) {
      setPending(false);
      setMessage(result.offline ? "No connection. You are not signed in." : result.error);
      return;
    }
    const redirect = typeof result.data.redirect === "string" ? result.data.redirect : "/";
    window.location.assign(redirect);
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <label className="block text-sm">
        Username or email
        <input
          name="email"
          placeholder="jsmith2028"
          className="mt-1 min-h-[44px] w-full rounded-lg border border-card-border bg-background px-3 py-3 font-mono"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
      </label>
      <label className="block text-sm">
        Password
        <input
          name="password"
          type="password"
          className="mt-1 min-h-[44px] w-full rounded-lg border border-card-border bg-background px-3 py-3"
          autoComplete="current-password"
        />
      </label>
      {error === "setup" && (
        <p className="text-sm text-amber-300">
          Use the setup link or QR code from your coach or admin to create your password first.
        </p>
      )}
      {error === "session" && (
        <p className="text-sm text-amber-300">Your session expired. Sign in again.</p>
      )}
      {error && error !== "setup" && error !== "session" && (
        <p className="text-sm text-red-400">Invalid credentials</p>
      )}
      {message ? (
        <p role="alert" className="text-sm text-red-400">
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-[44px] w-full rounded-lg bg-accent py-3 font-semibold text-background disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
