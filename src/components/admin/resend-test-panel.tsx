"use client";

import { useState } from "react";

export function ResendTestPanel(props: { defaultTo?: string }) {
  const [to, setTo] = useState(props.defaultTo ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/resend-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Send failed.");
        return;
      }
      setMessage(data.message ?? "Sent.");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={send} className="mt-4 space-y-3 rounded-2xl border border-card-border bg-card p-4">
      <h2 className="text-lg font-semibold">Resend smoke test</h2>
      <p className="text-sm text-muted">
        Sends the same 6-digit login code email class join uses. Requires{" "}
        <code className="text-xs">RESEND_API_KEY</code> and a verified{" "}
        <code className="text-xs">EMAIL_FROM</code> on the server.
      </p>
      <label className="block text-sm">
        Send to
        <input
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          required
          placeholder="you@pro-gradus.com"
          className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
        />
      </label>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {message ? <p className="text-sm text-accent">{message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send test code"}
      </button>
    </form>
  );
}
