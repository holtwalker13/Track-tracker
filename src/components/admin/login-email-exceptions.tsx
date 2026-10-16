"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type LoginException = { id: string; email: string; role: string; note: string | null };

export function LoginEmailExceptions({
  studentDomains,
  facultyDomains,
  exceptions,
}: {
  studentDomains: string[];
  facultyDomains: string[];
  exceptions: LoginException[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"STUDENT" | "FACULTY">("STUDENT");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/admin/login-exceptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role, note }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not save exception.");
      return;
    }
    setEmail("");
    setNote("");
    router.refresh();
  }

  async function remove(id: string) {
    setError(null);
    const res = await fetch("/api/admin/login-exceptions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Could not remove exception.");
      return;
    }
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-card-border bg-card p-4 lg:col-span-2">
      <h2 className="text-base font-semibold">Login email exceptions</h2>
      <p className="mt-1 text-sm text-muted">
        Students sign in with {studentDomains.map((d) => `@${d}`).join(" or ") || "a school email"}.
        Faculty sign in with {facultyDomains.map((d) => `@${d}`).join(" or ") || "a school email"}.
        Add an address here when someone must use a different email.
      </p>
      <form onSubmit={add} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto]">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@email.com"
          className="rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value === "FACULTY" ? "FACULTY" : "STUDENT")}
          className="rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
        >
          <option value="STUDENT">Student</option>
          <option value="FACULTY">Faculty</option>
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-background disabled:opacity-50"
        >
          {pending ? "Saving…" : "Add exception"}
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      {exceptions.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {exceptions.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-card-border px-3 py-2"
            >
              <p className="text-sm">
                <span className="font-mono">{row.email}</span>
                <span className="ml-2 text-xs uppercase text-muted">{row.role}</span>
                {row.note ? <span className="ml-2 text-xs text-muted">{row.note}</span> : null}
              </p>
              <button
                type="button"
                onClick={() => void remove(row.id)}
                className="text-xs font-semibold text-sport-red hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">No exceptions yet.</p>
      )}
    </section>
  );
}
