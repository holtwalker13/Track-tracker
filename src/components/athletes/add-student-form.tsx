"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEFAULT_CLASS_YEAR, GRADE_LEVELS } from "@/lib/grades";

export function AddStudentForm({
  classes,
}: {
  classes: { id: string; name: string; period: string | null }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/students", {
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
        classId: form.get("classId") || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not add student");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-sky-400/20 px-4 py-2 text-sm font-semibold text-sky-300 ring-1 ring-sky-400/40 hover:bg-sky-400/30"
      >
        + Add student
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-card-border bg-card p-4 shadow-[0_0_24px_rgba(56,189,248,0.08)]"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Add student to roster</h3>
        <button type="button" className="text-sm text-muted hover:text-foreground" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          <input
            name="studentNumber"
            placeholder="Optional — auto S0001…"
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 font-mono"
          />
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
          <select
            name="classYear"
            defaultValue={DEFAULT_CLASS_YEAR}
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
          >
            {GRADE_LEVELS.map((y) => (
              <option key={y} value={y}>
                Class of {y}
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
          Sports (optional / blank for PE-only)
          <input name="sports" placeholder="volleyball, track" className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2" />
        </label>
        <label className="text-sm">
          Class hour
          <select name="classId" defaultValue="" className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2">
            <option value="">None</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {[c.period, c.name].filter(Boolean).join(" · ")}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save student"}
      </button>
    </form>
  );
}
