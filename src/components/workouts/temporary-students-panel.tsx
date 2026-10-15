"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TempStudent = { id: string; firstName: string; lastName: string };
type Match = { id: string; firstName: string; lastName: string; studentNumber: string };

export function TemporaryStudentsPanel({
  classId,
  date,
  students,
}: {
  classId: string;
  date: string;
  students: TempStudent[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);

  async function createTemp(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/students/provisional", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, date, firstName, lastName }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not add temporary student");
      return;
    }
    setFirstName("");
    setLastName("");
    setOpen(false);
    router.refresh();
  }

  async function searchOfficial(next: string) {
    setQuery(next);
    if (next.trim().length < 1) {
      setMatches([]);
      return;
    }
    const res = await fetch(`/api/students?q=${encodeURIComponent(next.trim())}&official=1`);
    const data = await res.json().catch(() => ({ students: [] }));
    setMatches(data.students ?? []);
  }

  async function connect(provisionalStudentId: string, officialStudentId: string, label: string) {
    if (!window.confirm(`Move this temporary log onto ${label}? Saved marks stay as they are.`)) return;
    setPending(true);
    setError(null);
    const res = await fetch("/api/students/provisional/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provisionalStudentId, officialStudentId }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not connect student");
      return;
    }
    setLinkingId(null);
    setQuery("");
    setMatches([]);
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-amber-400/30 bg-amber-500/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-amber-100">Temporary students</h2>
          <p className="mt-1 text-xs text-muted">
            {students.length > 0
              ? "These logs are not tied to a roster student yet. Connect them before the data is treated as official."
              : "If someone shows up who is not on the roster, add them here for this workout. Connect them to a real student later."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg bg-amber-400/20 px-3 py-2 text-xs font-semibold text-amber-100"
        >
          Add temporary student
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-sport-red">{error}</p> : null}

      {open ? (
        <form onSubmit={createTemp} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            required
            className="rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
          />
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            required
            className="rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-background disabled:opacity-50"
          >
            {pending ? "Adding…" : "Add to workout"}
          </button>
        </form>
      ) : null}

      {students.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {students.map((student) => (
            <li key={student.id} className="rounded-xl border border-amber-400/20 bg-background/40 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {student.firstName} {student.lastName}
                  <span className="ml-2 text-[10px] font-semibold uppercase text-amber-200">Temporary</span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setLinkingId(student.id);
                    setQuery("");
                    setMatches([]);
                  }}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  Connect to roster student
                </button>
              </div>
              {linkingId === student.id ? (
                <div className="mt-2 space-y-1">
                  <input
                    value={query}
                    onChange={(e) => void searchOfficial(e.target.value)}
                    placeholder="Search the official roster"
                    className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
                  />
                  <ul>
                    {matches.map((match) => (
                      <li key={match.id}>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            void connect(
                              student.id,
                              match.id,
                              `${match.firstName} ${match.lastName}`
                            )
                          }
                          className="flex w-full justify-between rounded-lg px-2 py-1 text-left text-sm hover:bg-background"
                        >
                          <span>
                            {match.firstName} {match.lastName}
                          </span>
                          <span className="font-mono text-xs text-muted">{match.studentNumber}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
