"use client";

import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActivityIcon } from "@/lib/activity-icons";
import { KPI_METRIC_META } from "@/lib/kpi-targets";
import {
  defaultSessionNameForClass,
  isWeightliftingClassName,
  LIFTING_SESSION_ACTIVITIES,
} from "@/lib/lifting";
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

  const [classId, setClassId] = useState(defaultClassId);

  const selectedClass = useMemo(
    () => sectionClasses.find((c) => c.id === classId),
    [sectionClasses, classId]
  );

  const liftingOnly = selectedClass ? isWeightliftingClassName(selectedClass.name) : false;

  const sessionActivities = liftingOnly ? LIFTING_SESSION_ACTIVITIES : KPI_METRIC_META;

  const defaultName = defaultSessionNameForClass(
    selectedClass?.name ?? "Performance Test",
    sameDayCount
  );

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
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
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
      {liftingOnly && (
        <p className="text-sm text-muted">
          Strength-only preset for this weight room section. Speed and jump KPIs stay available in
          other class sessions.
        </p>
      )}
      <fieldset>
        <legend className="text-sm font-medium text-muted">
          {liftingOnly ? "Lifts" : "Events"}
        </legend>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {sessionActivities.map((m) => (
            <label
              key={m.slug}
              className="group relative flex cursor-pointer flex-col items-start gap-2 rounded-2xl border border-card-border bg-background/50 px-3.5 py-3.5 text-left transition duration-150 hover:-translate-y-0.5 hover:border-sky-400/50 hover:bg-sky-400/10 hover:shadow-[0_8px_24px_rgba(56,189,248,0.12)] active:translate-y-0 active:scale-[0.97] has-[:checked]:border-sky-400/70 has-[:checked]:bg-sky-500/15 has-[:checked]:shadow-[0_0_20px_rgba(56,189,248,0.16)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-sky-400"
            >
              <input
                type="checkbox"
                name="activity"
                value={m.slug}
                defaultChecked
                className="peer sr-only"
              />
              <span className="pointer-events-none absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full border border-card-border bg-background/80 text-transparent transition peer-checked:border-sky-400 peer-checked:bg-sky-500 peer-checked:text-white">
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
              </span>
              <ActivityIcon slug={m.slug} className="pointer-events-none h-6 w-6" />
              <span className="pointer-events-none pr-5 text-sm font-semibold leading-snug">{m.name}</span>
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
