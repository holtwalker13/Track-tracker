"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GRADE_LEVELS, classYearShort } from "@/lib/grades";

export function CreateClassForm({ surface = "card" }: { surface?: "card" | "none" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const type = String(fd.get("classType") ?? "");
    let name = String(fd.get("name") ?? "").trim();
    const period = String(fd.get("period") ?? "").trim();
    if (!name && type === "weights") {
      name = period ? `${period} Weights` : "Weightlifting";
    }
    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        period,
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
    <form
      onSubmit={onSubmit}
      className={
        surface === "card"
          ? "space-y-3 rounded-2xl border border-card-border bg-card p-4"
          : "space-y-3"
      }
    >
      {surface === "card" ? <h2 className="font-semibold">Create a class</h2> : null}
      <p className="text-sm text-muted">
        Athletes can belong to more than one class (weights, speed, a graduating year, etc.).
      </p>
      <label className="block text-sm">
        Class type
        <select
          name="classType"
          defaultValue="custom"
          className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
        >
          <option value="custom">Custom</option>
          <option value="weights">Weightlifting</option>
          <option value="pe">PE</option>
          <option value="speed">Speed</option>
        </select>
      </label>
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
                {y} ({classYearShort(y)})
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

export function CreateWeightsPeriodsButton({ surface = "card" }: { surface?: "card" | "none" }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function createPeriods() {
    setPending(true);
    setMsg(null);
    let created = 0;
    for (const n of [1, 2, 3, 4]) {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Period ${n} Weights`, period: `Period ${n}` }),
      });
      if (res.ok) created += 1;
    }
    setPending(false);
    setMsg(`Added ${created} weightlifting period${created === 1 ? "" : "s"}.`);
    router.refresh();
  }

  return (
    <div className={surface === "card" ? "rounded-2xl border border-card-border bg-card p-4" : "space-y-2"}>
      {surface === "card" ? <h2 className="font-semibold">Weightlifting periods</h2> : null}
      {surface === "none" ? (
        <p className="text-sm font-medium text-muted">Quick add: weightlifting periods</p>
      ) : null}
      <p className="mt-1 text-sm text-muted">
        Create Period 1–4 Weights in one click, then upload a roster into them.
      </p>
      {msg && <p className="mt-2 text-sm text-success">{msg}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={() => void createPeriods()}
        className="mt-3 rounded-lg border border-card-border px-4 py-2 text-sm font-medium hover:bg-background"
      >
        {pending ? "Creating…" : "Add Period 1–4 Weights"}
      </button>
    </div>
  );
}
