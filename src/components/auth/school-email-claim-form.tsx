"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SchoolEmailClaimForm({
  nextPath,
  defaultEmail,
}: {
  nextPath: string;
  defaultEmail: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/auth/school-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not save that email.");
      return;
    }
    router.push(nextPath);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label className="block text-sm">
        School email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@jacksonindians.us"
          className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-3"
          autoComplete="email"
        />
      </label>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-accent py-3 font-semibold text-background disabled:opacity-50"
      >
        {pending ? "Saving…" : "Use this email"}
      </button>
    </form>
  );
}
