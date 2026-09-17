"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KPI_METRIC_META } from "@/lib/kpi-targets";

export function NewTestingSessionForm({
  classes,
}: {
  classes: { id: string; name: string; period: string | null }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const slugs = fd.getAll("activity").map(String);
    const res = await fetch("/api/testing/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        testingDate: fd.get("testingDate"),
        classId: fd.get("classId") || null,
        activitySlugs: slugs,
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create session");
      return;
    }
    router.push(`/coach/testing/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mb-8 space-y-3 rounded-2xl border border-card-border bg-card p-4">
      <h2 className="font-semibold">New live testing session</h2>
      <p className="text-sm text-muted">
        A test date is required. That date is the X-axis on progress charts (fall vs spring, re-tests,
        etc.).
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm sm:col-span-1">
          Name
          <input
            required
            name="name"
            placeholder="April speed day"
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Test date
          <input
            required
            name="testingDate"
            type="date"
            defaultValue={today}
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Class
          <select
            name="classId"
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
          >
            <option value="">No class (empty roster)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.period ? ` · ${c.period}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset>
        <legend className="text-sm text-muted">Events</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {KPI_METRIC_META.map((m) => (
            <label
              key={m.slug}
              className="inline-flex items-center gap-2 rounded-full border border-card-border px-3 py-1 text-sm"
            >
              <input type="checkbox" name="activity" value={m.slug} defaultChecked />
              {m.name}
            </label>
          ))}
        </div>
      </fieldset>
      {error && <p className="text-sm text-sport-red">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 font-medium text-background"
      >
        {pending ? "Creating…" : "Start live testing"}
      </button>
    </form>
  );
}
