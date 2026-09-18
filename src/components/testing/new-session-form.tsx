"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KPI_METRIC_META } from "@/lib/kpi-targets";
import {
  classSectionLabel,
  findClassForPeriod,
  isGraduatingClassName,
} from "@/lib/periods";

export function NewTestingSessionForm({
  classes,
  sameDayCount = 0,
}: {
  classes: { id: string; name: string; period: string | null }[];
  sameDayCount?: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const sectionClasses = useMemo(
    () => classes.filter((c) => !isGraduatingClassName(c.name)),
    [classes]
  );

  const defaultClassId = useMemo(
    () => findClassForPeriod(sectionClasses)?.id ?? "",
    [sectionClasses]
  );

  const defaultName =
    sameDayCount > 0 ? `Performance Test (${sameDayCount + 1})` : "Performance Test";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const classId = String(fd.get("classId") ?? "");
    if (!classId) {
      setPending(false);
      setError("Pick a class hour / section before starting.");
      return;
    }
    const slugs = fd.getAll("activity").map(String);
    const res = await fetch("/api/testing/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        testingDate: fd.get("testingDate"),
        classId,
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
        Class hour is required. Period is guessed from Central Time so you can start quickly — change
        it if you need another section.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm sm:col-span-1">
          Name
          <input
            name="name"
            defaultValue={defaultName}
            placeholder="Performance Test"
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
          Class hour / section
          <select
            required
            name="classId"
            defaultValue={defaultClassId}
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
          >
            <option value="" disabled>
              Select a section…
            </option>
            {sectionClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {classSectionLabel(c)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {sectionClasses.length === 0 && (
        <p className="text-sm text-sport-red">
          No period / semester sections found. Create a class with a period (e.g. Fall 2026 Period 1)
          under Classes first.
        </p>
      )}
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
        disabled={pending || sectionClasses.length === 0}
        className="rounded-lg bg-accent px-4 py-2 font-medium text-background disabled:opacity-50"
      >
        {pending ? "Creating…" : "Start live testing"}
      </button>
    </form>
  );
}
