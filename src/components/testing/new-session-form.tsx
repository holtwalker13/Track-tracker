"use client";

import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActivityIcon } from "@/lib/activity-icons";
import { defaultSessionNameForClass } from "@/lib/lifting";
import {
  classSectionLabel,
  findClassForPeriod,
  isGraduatingClassName,
} from "@/lib/periods";

type KpiLibraryItem = { slug: string; name: string };

type ClassKpiOrdering = { ranked: string[]; unranked: string[] };

export function NewTestingSessionForm({
  classes,
  defaultClassId: defaultClassIdProp,
  sameDayCount = 0,
  kpiLibrary,
  metricsByClassId,
  surface = "card",
}: {
  classes: { id: string; name: string; period: string | null }[];
  defaultClassId?: string;
  sameDayCount?: number;
  /** Full school KPI library (testing metrics + workout lifts + customs). */
  kpiLibrary?: KpiLibraryItem[];
  /** Per-class KPI set ordering: ranked slugs first, then unranked set members. */
  metricsByClassId?: Record<string, ClassKpiOrdering>;
  /** `card` = inline page block; `none` = body inside a modal shell */
  surface?: "card" | "none";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const sectionClasses = useMemo(
    () => classes.filter((c) => !isGraduatingClassName(c.name)),
    [classes]
  );

  const defaultClassId = useMemo(() => {
    if (
      defaultClassIdProp &&
      sectionClasses.some((c) => c.id === defaultClassIdProp)
    ) {
      return defaultClassIdProp;
    }
    return findClassForPeriod(sectionClasses)?.id ?? "";
  }, [sectionClasses, defaultClassIdProp]);

  const [classId, setClassId] = useState(defaultClassId);

  const selectedClass = useMemo(
    () => sectionClasses.find((c) => c.id === classId),
    [sectionClasses, classId]
  );

  const library = useMemo<KpiLibraryItem[]>(
    () => (kpiLibrary?.length ? kpiLibrary : []),
    [kpiLibrary]
  );
  const libraryBySlug = useMemo(
    () => new Map(library.map((a) => [a.slug, a])),
    [library]
  );

  /**
   * Test list for the selected class: the class KPI set's ranked KPIs first
   * (pre-checked), then the set's unranked KPIs, then the rest of the school
   * KPI library — every KPI from the KPIs tab is available for testing.
   */
  const ordering = metricsByClassId?.[classId] ?? { ranked: [], unranked: [] };
  const sessionActivities = useMemo(() => {
    const seen = new Set<string>();
    const ordered: { slug: string; name: string; ranked: boolean }[] = [];
    const push = (slug: string, ranked: boolean) => {
      if (seen.has(slug)) return;
      const meta = libraryBySlug.get(slug);
      if (!meta) return;
      seen.add(slug);
      ordered.push({ slug, name: meta.name, ranked });
    };
    for (const slug of ordering.ranked) push(slug, true);
    for (const slug of ordering.unranked) push(slug, false);
    const rest = library
      .filter((a) => !seen.has(a.slug))
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const a of rest) push(a.slug, false);
    return ordered;
  }, [ordering.ranked, ordering.unranked, library, libraryBySlug]);

  const [checked, setChecked] = useState<Set<string>>(() => new Set(ordering.ranked));

  function onClassChange(nextClassId: string) {
    setClassId(nextClassId);
    setChecked(new Set(metricsByClassId?.[nextClassId]?.ranked ?? []));
  }

  function toggle(slug: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

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
    <form
      onSubmit={onSubmit}
      className={
        surface === "card"
          ? "mb-8 space-y-3 rounded-2xl border border-card-border bg-card p-4"
          : "space-y-3"
      }
    >
      {surface === "card" ? <h2 className="font-semibold">New live testing session</h2> : null}
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
            onChange={(e) => onClassChange(e.target.value)}
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
        <legend className="text-sm font-medium text-muted">Tests</legend>
        <p className="mt-1 text-xs text-muted">
          The class&apos;s ranked KPIs are checked first. Every KPI from the KPIs tab — testing
          metrics and workout lifts, ranked or not — is available below.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {sessionActivities.map((m) => {
            const ranked = m.ranked;
            return (
            <label
              key={m.slug}
              className="group relative flex cursor-pointer flex-col items-start gap-2 rounded-2xl border border-card-border bg-background/50 px-3.5 py-3.5 text-left transition duration-150 hover:-translate-y-0.5 hover:border-sky-400/50 hover:bg-sky-400/10 hover:shadow-[0_8px_24px_rgba(56,189,248,0.12)] active:translate-y-0 active:scale-[0.97] has-[:checked]:border-sky-400/70 has-[:checked]:bg-sky-500/15 has-[:checked]:shadow-[0_0_20px_rgba(56,189,248,0.16)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-sky-400"
            >
              <input
                type="checkbox"
                name="activity"
                value={m.slug}
                checked={checked.has(m.slug)}
                onChange={() => toggle(m.slug)}
                className="peer sr-only"
              />
              <span className="pointer-events-none absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full border border-card-border bg-background/80 text-transparent transition peer-checked:border-sky-400 peer-checked:bg-sky-500 peer-checked:text-white">
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
              </span>
              <ActivityIcon slug={m.slug} className="pointer-events-none h-6 w-6" />
              <span className="pointer-events-none pr-5 text-sm font-semibold leading-snug">{m.name}</span>
              {!ranked ? (
                <span className="pointer-events-none text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Unranked
                </span>
              ) : null}
            </label>
            );
          })}
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
