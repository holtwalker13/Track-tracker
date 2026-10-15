"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { DEFAULT_CLASS_YEAR, GRADE_LEVELS } from "@/lib/grades";
import { CoachModal } from "@/components/ui/coach-modal";

type Match = { id: string; firstName: string; lastName: string; studentNumber: string };
type ClassOption = { id: string; name: string; period: string | null };

export function QuickAddSessionStudent({
  sessionId,
  classId,
}: {
  sessionId: string;
  classId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [manual, setManual] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);

  useEffect(() => {
    if (!open || !manual) return;
    let cancelled = false;
    void fetch("/api/classes")
      .then((res) => (res.ok ? res.json() : { classes: [] }))
      .then((data: { classes?: ClassOption[] }) => {
        if (!cancelled) setClasses(data.classes ?? []);
      })
      .catch(() => {
        if (!cancelled) setClasses([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, manual]);

  useEffect(() => {
    if (!open || manual) return;
    const q = query.trim();
    if (q.length < 1) {
      setMatches([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void fetch(`/api/students?q=${encodeURIComponent(q)}`)
        .then((res) => (res.ok ? res.json() : { students: [] }))
        .then((data: { students?: Match[] }) => setMatches(data.students ?? []))
        .catch(() => setMatches([]));
    }, 200);
    return () => window.clearTimeout(handle);
  }, [query, open, manual]);

  function close() {
    setOpen(false);
    setQuery("");
    setMatches([]);
    setManual(false);
    setError("");
  }

  async function addExisting(studentId: string) {
    setPending(true);
    setError("");
    const res = await fetch(`/api/testing/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollStudentId: studentId }),
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not add student");
      return;
    }
    close();
    router.refresh();
  }

  async function createStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const createRes = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        studentNumber: form.get("studentNumber"),
        gender: form.get("gender"),
        classYear: Number(form.get("classYear")),
        sports: form.get("sports") || null,
        participationType: form.get("participationType") || null,
        classId: String(form.get("classId") || classId || "") || null,
      }),
    });
    const created = await createRes.json().catch(() => ({}));
    if (!createRes.ok || typeof created.studentId !== "string") {
      setPending(false);
      setError(created.error ?? "Could not add student");
      return;
    }
    const addRes = await fetch(`/api/testing/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollStudentId: created.studentId }),
    });
    setPending(false);
    if (!addRes.ok) {
      const data = await addRes.json().catch(() => ({}));
      setError(data.error ?? "Student was created but not added to this test");
      return;
    }
    close();
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-background"
      >
        <UserPlus className="h-3.5 w-3.5" aria-hidden />
        Add student
      </button>
      {open ? (
        <CoachModal eyebrow="Testing" title="Add student to this test" onClose={close} maxWidth="max-w-lg">
          <div className="space-y-3">
            {error ? <p className="text-sm text-sport-red">{error}</p> : null}
            {!manual ? (
              <>
                <label className="block text-sm">
                  School roster
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name or student ID"
                    className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
                  />
                </label>
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {matches.map((student) => (
                    <li key={student.id}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => void addExisting(student.id)}
                        className="flex w-full items-baseline justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-background"
                      >
                        <span>
                          {student.firstName} {student.lastName}
                        </span>
                        <span className="font-mono text-xs text-muted">{student.studentNumber}</span>
                      </button>
                    </li>
                  ))}
                  {query.trim() && matches.length === 0 ? (
                    <li className="px-2 py-1 text-sm text-muted">No matching student.</li>
                  ) : null}
                </ul>
                <button
                  type="button"
                  onClick={() => setManual(true)}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Can’t find them? Enter a new student
                </button>
              </>
            ) : (
              <form onSubmit={createStudent} className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  First name
                  <input name="firstName" required className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2" />
                </label>
                <label className="text-sm">
                  Last name
                  <input name="lastName" required className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2" />
                </label>
                <label className="text-sm">
                  Student ID
                  <input name="studentNumber" placeholder="Optional" className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 font-mono" />
                </label>
                <label className="text-sm">
                  Gender
                  <select name="gender" defaultValue="F" className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2">
                    <option value="F">Girls</option>
                    <option value="M">Boys</option>
                  </select>
                </label>
                <label className="text-sm">
                  Graduating class
                  <select name="classYear" defaultValue={DEFAULT_CLASS_YEAR} className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2">
                    {GRADE_LEVELS.map((year) => (
                      <option key={year} value={year}>
                        Class of {year}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Tracking type
                  <select name="participationType" defaultValue="" className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2">
                    <option value="">Unset</option>
                    <option value="PE">PE student</option>
                    <option value="ATHLETE">Student athlete</option>
                  </select>
                </label>
                <label className="text-sm sm:col-span-2">
                  Sports
                  <input name="sports" placeholder="volleyball, track" className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2" />
                </label>
                <label className="text-sm sm:col-span-2">
                  Class
                  <select
                    name="classId"
                    defaultValue={classId ?? ""}
                    className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
                  >
                    <option value="">None</option>
                    {classId && !classes.some((c) => c.id === classId) ? (
                      <option value={classId}>This test’s class</option>
                    ) : null}
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {[c.period, c.name].filter(Boolean).join(" · ")}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-xs text-muted sm:col-span-2">
                  {classId
                    ? "They’ll be added to this class and this test."
                    : "This test has no class, so they’ll be added to the school roster and this test."}
                </p>
                <div className="flex gap-2 sm:col-span-2">
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-background disabled:opacity-50"
                  >
                    {pending ? "Adding…" : "Add student"}
                  </button>
                  <button type="button" onClick={() => setManual(false)} className="text-sm text-muted hover:text-foreground">
                    Back to search
                  </button>
                </div>
              </form>
            )}
          </div>
        </CoachModal>
      ) : null}
    </>
  );
}
