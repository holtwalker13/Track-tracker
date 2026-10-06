"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { CoachLoginLinkButton } from "@/components/admin/coach-login-link-button";
import type { CoachLoginStatus } from "@/lib/services/coach-login-invite";

type CoachRow = {
  coachProfileId: string;
  email: string;
  fullName: string;
  loginStatus: CoachLoginStatus;
  classes: { id: string; name: string; programKind: string | null }[];
};

export function CoachStaffPanel({
  schoolSlug,
  canManage = false,
}: {
  schoolSlug: string | null;
  /** Admin-only: create coaches and send setup / reset links. */
  canManage?: boolean;
}) {
  const router = useRouter();
  const [coaches, setCoaches] = useState<CoachRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
    if (!canManage) return;
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
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create coach");
      return;
    }
    setMsg(
      `Created ${data.email}. Copy the setup link or show the QR code next to their name so they can set a password on their device.`
    );
    e.currentTarget.reset();
    await load();
    router.refresh();
  }

  async function onDeleteCoach(coach: CoachRow) {
    if (!canManage || deletingId) return;
    const confirmed = window.confirm(
      `Delete ${coach.fullName} (${coach.email})?\n\nTheir login and coach access are removed. Classes and athlete marks they entered are kept; their KPI sets move to another coach at this school.`
    );
    if (!confirmed) return;
    setDeletingId(coach.coachProfileId);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/coaches/${coach.coachProfileId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not delete coach");
        return;
      }
      setMsg(`Deleted ${coach.fullName}.`);
      await load();
      router.refresh();
    } catch {
      setError("Could not delete coach");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6 rounded-2xl border border-card-border bg-card p-4">
      {canManage ? (
        <>
          <div>
            <h3 className="font-semibold">Add coach</h3>
            <p className="mt-1 text-sm text-muted">
              Create a coach account, then send a{" "}
              <strong className="font-medium text-foreground">setup link or QR code</strong> so they
              can confirm name/email and set a password. Coaches browse the full roster but run live
              tests only for athletes in their classes.
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
                placeholder={schoolSlug ? `ty.crowden@${schoolSlug}.demo` : "coach@school.demo"}
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
        </>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : null}

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Staff at this school
        </h3>
        {loading ? (
          <p className="mt-2 text-sm text-muted">Loading…</p>
        ) : coaches.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No coaches yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-card-border rounded-xl border border-card-border">
            {coaches.map((c) => (
              <li
                key={c.coachProfileId}
                className="flex flex-wrap items-start justify-between gap-3 px-3 py-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.fullName}</p>
                  <p className="font-mono text-xs text-muted">{c.email}</p>
                  {c.classes.length > 0 ? (
                    <p className="mt-1 text-xs text-muted">
                      Groups: {c.classes.map((cl) => cl.name).join(", ")}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted">
                      No classes yet — coach creates them after login.
                    </p>
                  )}
                </div>
                {canManage ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <CoachLoginLinkButton
                      coachProfileId={c.coachProfileId}
                      fullName={c.fullName}
                      loginStatus={c.loginStatus}
                    />
                    <button
                      type="button"
                      onClick={() => onDeleteCoach(c)}
                      disabled={deletingId === c.coachProfileId}
                      title={`Delete ${c.fullName}`}
                      aria-label={`Delete ${c.fullName}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-2 text-xs font-semibold text-muted transition hover:border-sport-red/50 hover:text-sport-red disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      {deletingId === c.coachProfileId ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
