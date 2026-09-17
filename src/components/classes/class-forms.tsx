"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GRADE_LEVELS, classYearLabel } from "@/lib/grades";

export function CreateClassForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        period: fd.get("period"),
        gradeLevel: fd.get("gradeLevel"),
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create class");
      return;
    }
    router.push(`/coach/classes/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-card-border bg-card p-4">
      <h2 className="font-semibold">Create a class</h2>
      <p className="text-sm text-muted">
        Athletes can belong to more than one class (weights, speed, a graduating year, etc.).
      </p>
      <label className="block text-sm">
        Name
        <input
          required
          name="name"
          placeholder="Varsity Weights"
          className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          Period (optional)
          <input
            name="period"
            placeholder="Period 2"
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Graduating class (optional)
          <select
            name="gradeLevel"
            defaultValue=""
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
          >
            <option value="">Any / mixed</option>
            {GRADE_LEVELS.map((y) => (
              <option key={y} value={y}>
                {classYearLabel(y)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="text-sm text-sport-red">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 font-medium text-background"
      >
        {pending ? "Creating…" : "Create class"}
      </button>
    </form>
  );
}

export function ImportClassesForm() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/classes/import", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "Import failed");
      return;
    }
    setMsg(`Imported ${data.classes} class(es), ${data.enrolled} enrollment(s).`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-card-border bg-card p-4">
      <h2 className="font-semibold">Import classes (CSV)</h2>
      <p className="text-sm text-muted">
        Header row: <code>className,period,studentNumber</code> or{" "}
        <code>className,firstName,lastName</code>. The same athlete can appear in multiple classes.
      </p>
      <input required name="file" type="file" accept=".csv,text/csv" className="text-sm" />
      {msg && <p className="text-sm text-muted">{msg}</p>}
      <button type="submit" className="rounded-lg border border-card-border px-4 py-2 text-sm">
        Import CSV
      </button>
    </form>
  );
}
