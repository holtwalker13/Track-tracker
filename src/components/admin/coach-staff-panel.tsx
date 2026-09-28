"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CoachRow = {
  coachProfileId: string;
  email: string;
  fullName: string;
  classes: { id: string; name: string; programKind: string | null }[];
};

export function CoachStaffPanel({ schoolSlug }: { schoolSlug: string | null }) {
  const router = useRouter();
  const [coaches, setCoaches] = useState<CoachRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/coaches");
      const data = await res.json();
      if (!res.ok) {
        setCoaches([]);
        setError(data.error ?? "Could not load coaches");
        return;
      }
      setCoaches(data.coaches ?? []);
    } catch {
      setError("Could not load coaches");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/coaches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: fd.get("firstName"),
        lastName: fd.get("lastName"),
        email: fd.get("email"),
        password: fd.get("password"),
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create coach");
      return;
    }
    setMsg(`Created ${data.email}. They sign in and manage their own classes and testing groups.`);
    e.currentTarget.reset();
    await load();
    router.refresh();
  }

  return (
    <div className="space-y-6 rounded-2xl border border-card-border bg-card p-4 lg:col-span-2">
      <div>
        <h2 className="font-semibold">Coach accounts</h2>
        <p className="mt-1 text-sm text-muted">
          Athletic directors and app admins add coaches here. Each coach belongs to this school only.
          Coaches browse the full roster but run live tests only for athletes in{" "}
          <strong className="font-medium text-foreground">their classes or training groups</strong>{" "}
          (schools assign kids on the Classes page).
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-1">
          First name
          <input
            required
            name="firstName"
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
          />
        </label>
        <label className="block text-sm sm:col-span-1">
          Last name
          <input
            required
            name="lastName"
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          Email (login)
          <input
            required
            type="email"
            name="email"
            placeholder={schoolSlug ? `coach.name@${schoolSlug}.demo` : "coach@school.demo"}
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          Temporary password
          <input
            required
            type="password"
            name="password"
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-400 sm:col-span-2">{error}</p>}
        {msg && <p className="text-sm text-emerald-300 sm:col-span-2">{msg}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2 font-medium text-background sm:col-span-2 sm:w-fit"
        >
          {pending ? "Creating…" : "Add coach"}
        </button>
      </form>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Staff at this school</h3>
        {loading ? (
          <p className="mt-2 text-sm text-muted">Loading…</p>
        ) : coaches.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No coaches yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-card-border rounded-xl border border-card-border">
            {coaches.map((c) => (
              <li key={c.coachProfileId} className="px-3 py-3 text-sm">
                <p className="font-medium">{c.fullName}</p>
                <p className="font-mono text-xs text-muted">{c.email}</p>
                {c.classes.length > 0 ? (
                  <p className="mt-1 text-xs text-muted">
                    Groups: {c.classes.map((cl) => cl.name).join(", ")}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted">No classes assigned yet — coach creates them after login.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
