"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Dumbbell, Plus, Pencil, Trash2, X, Globe, Lock } from "lucide-react";
import { LiftBuilderModal } from "@/components/lifts/lift-builder-modal";
import { MEDAL_LABELS, MEDALS, type Medal } from "@/lib/kpi-targets";
import {
  AGE_BRACKETS,
  DEFAULT_AGE_BRACKET,
  KPI_CATEGORIES,
  KPI_UNITS,
  type AgeBracketId,
} from "@/lib/age-brackets";
import { COACHING_SPORTS, sportLabel } from "@/lib/sports";
import { cn } from "@/lib/utils";

type MetricInfo = {
  slug: string;
  name: string;
  unit: string;
  categorySlug?: string;
  custom?: boolean;
};

export type TargetCell = {
  gender: "F" | "M";
  medal: Medal;
  metricSlug: string;
  /** null = blank / leave unset */
  target: number | null;
  ageBracket: string;
};

type SetCoach = {
  id: string;
  user: { firstName: string; lastName: string; email: string };
};

type SetMetric = {
  metricSlug: string;
  ranked: boolean;
  sortOrder: number;
};

type SetTarget = {
  gender: string;
  medal: string;
  metricSlug: string;
  target: number;
  ageBracket: string;
};

export type KpiSetSummary = {
  id: string;
  name: string;
  sport: string;
  description: string | null;
  isPublic: boolean;
  isDefault: boolean;
  coachProfileId: string;
  schoolId: string;
  coach: SetCoach;
  metrics: SetMetric[];
  targets: SetTarget[];
};

function cellsFromSet(set: KpiSetSummary): TargetCell[] {
  return set.targets.map((t) => ({
    gender: t.gender === "M" ? "M" : "F",
    medal: t.medal as Medal,
    metricSlug: t.metricSlug,
    target: t.target,
    ageBracket: t.ageBracket || DEFAULT_AGE_BRACKET,
  }));
}

function rankedMapFromSet(set: KpiSetSummary): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const m of set.metrics) map[m.metricSlug] = m.ranked;
  return map;
}

export function KpiTargetsEditor({
  initial,
  metrics,
  initialSets,
  initialActiveSetId,
  publicSets: initialPublicSets,
  classScopeMode = false,
  classScopeLabel = null,
}: {
  initial: TargetCell[];
  metrics: MetricInfo[];
  initialSets: KpiSetSummary[];
  initialActiveSetId: string;
  publicSets: KpiSetSummary[];
  /** When true, KPI set is tied to School class/subgroup — no custom named sets. */
  classScopeMode?: boolean;
  classScopeLabel?: string | null;
}) {
  const router = useRouter();
  const [ownSets, setOwnSets] = useState(initialSets);
  const [publicSets, setPublicSets] = useState(initialPublicSets);
  const [activeSetId, setActiveSetId] = useState(initialActiveSetId);
  const activeSet = ownSets.find((s) => s.id === activeSetId) ?? ownSets[0] ?? null;

  const [cells, setCells] = useState(() =>
    activeSet ? cellsFromSet(activeSet) : initial
  );
  const [rankedBySlug, setRankedBySlug] = useState<Record<string, boolean>>(() =>
    activeSet ? rankedMapFromSet(activeSet) : {}
  );
  const [metricList, setMetricList] = useState(metrics);
  const [bracket, setBracket] = useState<AgeBracketId>(DEFAULT_AGE_BRACKET);
  const [gender, setGender] = useState<"F" | "M">("F");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [kpiBuilderDefaults, setKpiBuilderDefaults] = useState<KpiBuilderDefaults | undefined>();
  const [liftBuilderOpen, setLiftBuilderOpen] = useState(false);
  const [editing, setEditing] = useState<MetricInfo | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState<KpiSetSummary | null>(null);
  const [browsePublic, setBrowsePublic] = useState(false);

  useEffect(() => setMetricList(metrics), [metrics]);

  function loadSet(set: KpiSetSummary) {
    setActiveSetId(set.id);
    setCells(cellsFromSet(set));
    setRankedBySlug(rankedMapFromSet(set));
    setStatus("idle");
  }

  async function activateSet(id: string) {
    const set = ownSets.find((s) => s.id === id);
    if (!set) return;
    loadSet(set);
    await fetch("/api/kpi-sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "activate", kpiSetId: id }),
    });
  }

  function value(slug: string, medal: Medal): string {
    const cell = cells.find(
      (c) =>
        c.gender === gender &&
        c.medal === medal &&
        c.metricSlug === slug &&
        c.ageBracket === bracket
    );
    if (!cell || cell.target == null) return "";
    return String(cell.target);
  }

  function setValue(slug: string, medal: Medal, raw: string) {
    const target = raw.trim() === "" ? null : Number(raw);
    setCells((prev) => {
      const next = prev.filter(
        (c) =>
          !(
            c.gender === gender &&
            c.medal === medal &&
            c.metricSlug === slug &&
            c.ageBracket === bracket
          )
      );
      if (target != null && Number.isFinite(target)) {
        next.push({ gender, medal, metricSlug: slug, target, ageBracket: bracket });
      }
      return next;
    });
    setRankedBySlug((rankedPrev) => {
      const stillHas =
        (target != null && Number.isFinite(target)) ||
        cells.some(
          (c) =>
            c.metricSlug === slug &&
            !(
              c.gender === gender &&
              c.medal === medal &&
              c.ageBracket === bracket
            ) &&
            c.target != null
        );
      return {
        ...rankedPrev,
        [slug]: stillHas ? true : rankedPrev[slug] ?? false,
      };
    });
    setStatus("idle");
  }

  function toggleRanked(slug: string) {
    setRankedBySlug((prev) => {
      const nextRanked = !prev[slug];
      if (!nextRanked) {
        setCells((cellsPrev) => cellsPrev.filter((c) => c.metricSlug !== slug));
      }
      return { ...prev, [slug]: nextRanked };
    });
    setStatus("idle");
  }

  async function save() {
    if (!activeSet) return;
    setStatus("saving");
    const metricsPayload = metricList.map((m, index) => ({
      metricSlug: m.slug,
      ranked: Boolean(rankedBySlug[m.slug]),
      sortOrder: index,
    }));
    const res = await fetch(`/api/kpi-sets/${activeSet.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save-targets",
        cells,
        metrics: metricsPayload,
      }),
    });
    if (!res.ok) {
      setStatus("error");
      return;
    }
    const data = await res.json();
    if (data.set) {
      setOwnSets((prev) => prev.map((s) => (s.id === data.set.id ? data.set : s)));
      loadSet(data.set);
    }
    setStatus("saved");
  }

  async function togglePublic() {
    if (!activeSet) return;
    const res = await fetch(`/api/kpi-sets/${activeSet.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: !activeSet.isPublic }),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.set) {
      setOwnSets((prev) => prev.map((s) => (s.id === data.set.id ? data.set : s)));
    }
  }

  async function deleteMetric(slug: string) {
    if (
      !window.confirm(
        "Delete this KPI for your school? Targets will be cleared. Custom KPIs are removed entirely."
      )
    ) {
      return;
    }
    const res = await fetch("/api/kpi-targets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    if (!res.ok) {
      window.alert("Could not delete KPI.");
      return;
    }
    setMetricList((prev) => prev.filter((m) => m.slug !== slug));
    setCells((prev) => prev.filter((c) => c.metricSlug !== slug));
    setRankedBySlug((prev) => {
      const next = { ...prev };
      delete next[slug];
      return next;
    });
    router.refresh();
  }

  async function renameMetric(slug: string, name: string) {
    const res = await fetch("/api/kpi-targets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, name }),
    });
    if (!res.ok) {
      window.alert("Could not rename KPI.");
      return false;
    }
    setMetricList((prev) => prev.map((m) => (m.slug === slug ? { ...m, name } : m)));
    setEditing(null);
    router.refresh();
    return true;
  }

  const visibleMetrics = useMemo(() => {
    let list = metricList;
    if (bracket === "elem-k-2" || bracket === "elem-3-5") {
      list = list.filter(
        (m) =>
          m.custom ||
          !["squat-relative", "hang-clean-relative", "20-meter-start"].includes(m.slug)
      );
    }
    // Ranked first, then unranked
    return [...list].sort((a, b) => {
      const ar = rankedBySlug[a.slug] ? 0 : 1;
      const br = rankedBySlug[b.slug] ? 0 : 1;
      if (ar !== br) return ar - br;
      return a.name.localeCompare(b.name);
    });
  }, [bracket, metricList, rankedBySlug]);

  const rankedCount = visibleMetrics.filter((m) => rankedBySlug[m.slug]).length;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <p className="max-w-2xl text-sm text-muted">
          {classScopeMode ? (
            <>
              Configure ranked KPIs and medal targets for{" "}
              <strong className="font-medium text-foreground">
                {classScopeLabel ?? "this class"}
              </strong>
              . Unranked KPIs stay off leaderboards and medal standards.
            </>
          ) : (
            <>
              Build Gold / Silver / Bronze targets per class. Leave medals blank to mark a KPI{" "}
              <strong className="font-medium text-foreground">unranked</strong>. Select a class
              above to link targets to School classes and subgroups.
            </>
          )}
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setKpiBuilderDefaults(undefined);
              setBuilderOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-400/20 px-4 py-2.5 text-sm font-semibold text-sky-300 ring-1 ring-sky-400/40"
          >
            <Plus className="h-4 w-4" />
            Build KPI
          </button>
          <button
            type="button"
            onClick={() => setLiftBuilderOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-400/20 px-4 py-2.5 text-sm font-semibold text-sky-300 ring-1 ring-sky-400/40"
          >
            <Dumbbell className="h-4 w-4" />
            Build lift
          </button>
        </div>
      </div>

      <div className="mb-6 space-y-3 rounded-2xl border border-card-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          {classScopeMode ? (
            <div className="block min-w-[16rem] flex-1 text-sm">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                KPI scope
              </span>
              <p className="mt-1 rounded-lg border border-card-border bg-background px-3 py-2.5 font-medium">
                {classScopeLabel ?? activeSet?.name ?? "Class KPIs"}
              </p>
            </div>
          ) : (
            <label className="block min-w-[16rem] flex-1 text-sm">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                Active KPI set
              </span>
              <select
                value={activeSet?.id ?? ""}
                onChange={(e) => activateSet(e.target.value)}
                className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2.5"
              >
                {ownSets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {sportLabel(s.sport)}
                    {s.isDefault ? " (default)" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            {!classScopeMode ? (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-2 text-sm font-medium hover:bg-sky-400/10"
              >
                <Plus className="h-4 w-4" />
                New set
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setBrowsePublic((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-2 text-sm font-medium hover:bg-sky-400/10"
            >
              <Globe className="h-4 w-4" />
              {browsePublic ? "Hide public sets" : "Browse public sets"}
            </button>
            {activeSet && (
              <button
                type="button"
                onClick={togglePublic}
                className="inline-flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-2 text-sm font-medium hover:bg-sky-400/10"
                title={
                  activeSet.isPublic
                    ? "Make private"
                    : "Make public so other coaches can duplicate"
                }
              >
                {activeSet.isPublic ? (
                  <>
                    <Globe className="h-4 w-4 text-sky-300" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Private
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        {activeSet?.description ? (
          <p className="text-sm text-muted">{activeSet.description}</p>
        ) : null}
        <p className="text-xs text-muted">
          {rankedCount} ranked · {visibleMetrics.length - rankedCount} unranked in this age band
        </p>
      </div>

      {browsePublic && (
        <div className="mb-6 space-y-3 rounded-2xl border border-card-border bg-card p-4">
          <h3 className="text-sm font-semibold">Public KPI sets from other coaches</h3>
          {publicSets.length === 0 ? (
            <p className="text-sm text-muted">No public sets yet.</p>
          ) : (
            <ul className="divide-y divide-card-border/60">
              {publicSets.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {s.name}{" "}
                      <span className="text-sm font-normal text-muted">
                        · {sportLabel(s.sport)}
                      </span>
                    </p>
                    <p className="text-xs text-muted">
                      {s.coach.user.firstName} {s.coach.user.lastName}
                      {s.description ? ` — ${s.description}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDuplicateSource(s)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sky-400/20 px-3 py-2 text-sm font-semibold text-sky-300 ring-1 ring-sky-400/40"
                  >
                    <Copy className="h-4 w-4" />
                    Duplicate
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mb-4 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Age band</p>
        <div className="flex flex-wrap gap-2">
          {AGE_BRACKETS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBracket(b.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition",
                bracket === b.id
                  ? "bg-sky-400/20 text-sky-300 ring-1 ring-sky-400/55"
                  : "border border-card-border text-muted hover:text-sky-200"
              )}
            >
              {b.shortLabel}
            </button>
          ))}
        </div>
        <div className="grid max-w-xs grid-cols-2 rounded-lg bg-card p-1">
          {(
            [
              { id: "F" as const, label: "Girls" },
              { id: "M" as const, label: "Boys" },
            ] as const
          ).map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGender(g.id)}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-semibold",
                gender === g.id ? "bg-sky-500 text-white" : "text-muted"
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-card-border bg-card p-4">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <thead>
            <tr className="border-b border-card-border text-muted">
              <th className="py-2 pr-3 font-medium">Metric</th>
              <th className="py-2 pr-3 font-medium">Class</th>
              {MEDALS.map((medal) => (
                <th key={medal} className="py-2 pr-3 font-medium">
                  <span
                    className={
                      medal === "gold"
                        ? "text-sport-gold"
                        : medal === "silver"
                          ? "text-sport-silver"
                          : "text-sport-bronze"
                    }
                  >
                    {MEDAL_LABELS[medal]}
                  </span>
                </th>
              ))}
              <th className="py-2 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {visibleMetrics.map((meta, index) => {
              const ranked = Boolean(rankedBySlug[meta.slug]);
              const prevRanked =
                index === 0 ? true : Boolean(rankedBySlug[visibleMetrics[index - 1]!.slug]);
              const showDivider = index > 0 && prevRanked && !ranked;
              return (
                <Fragment key={meta.slug}>
                  {showDivider ? (
                    <tr className="border-b border-card-border/40">
                      <td colSpan={6} className="py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                        Unranked — not on leaderboards
                      </td>
                    </tr>
                  ) : null}
                  {index === 0 && ranked ? (
                    <tr className="border-b border-card-border/40">
                      <td colSpan={6} className="py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300/80">
                        Ranked — medal targets
                      </td>
                    </tr>
                  ) : null}
                  <tr className="border-b border-card-border/60">
                    <td className="py-2 pr-3 font-medium">
                      {meta.name}
                      <span className="mt-0.5 block text-xs font-normal text-muted">
                        {meta.unit}
                        {meta.custom ? " · custom" : ""}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        onClick={() => toggleRanked(meta.slug)}
                        className={cn(
                          "rounded-md px-2 py-1 text-xs font-semibold ring-1",
                          ranked
                            ? "bg-sky-400/15 text-sky-300 ring-sky-400/40"
                            : "bg-background text-muted ring-card-border"
                        )}
                      >
                        {ranked ? "Ranked" : "Unranked"}
                      </button>
                    </td>
                    {MEDALS.map((medal) => (
                      <td key={medal} className="py-2 pr-3">
                        <input
                          type="number"
                          step="any"
                          disabled={!ranked}
                          placeholder={ranked ? "" : "—"}
                          value={ranked ? value(meta.slug, medal) : ""}
                          onChange={(e) => setValue(meta.slug, medal, e.target.value)}
                          className="w-24 rounded-md border border-card-border bg-background px-2 py-1 font-mono tabular-nums disabled:opacity-40"
                        />
                      </td>
                    ))}
                    <td className="py-2">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => setEditing(meta)}
                          className="rounded-md p-1.5 text-muted hover:bg-sky-400/10 hover:text-sky-300"
                          aria-label={`Edit ${meta.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMetric(meta.slug)}
                          className="rounded-md p-1.5 text-muted hover:bg-sport-red/10 hover:text-sport-red"
                          aria-label={`Delete ${meta.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={status === "saving" || !activeSet}
          className="rounded-lg bg-accent px-4 py-2 font-medium text-background disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Save KPI set"}
        </button>
        {status === "saved" && <p className="text-sm text-success">Saved for this set.</p>}
        {status === "error" && <p className="text-sm text-sport-red">Could not save. Try again.</p>}
        <p className="text-xs text-muted">
          Programs on{" "}
          <Link href="/coach/programs" className="text-accent hover:underline">
            Workout programs
          </Link>
        </p>
      </div>

      {builderOpen && (
        <KpiBuilderModal
          defaults={kpiBuilderDefaults}
          onClose={() => setBuilderOpen(false)}
          onCreated={(m) => {
            setMetricList((prev) => [...prev, m]);
            setRankedBySlug((prev) => ({ ...prev, [m.slug]: false }));
            setBuilderOpen(false);
            router.refresh();
          }}
        />
      )}

      {liftBuilderOpen && (
        <LiftBuilderModal
          onClose={() => setLiftBuilderOpen(false)}
          onCreated={(lift) => {
            setMetricList((prev) => [
              ...prev,
              {
                slug: lift.slug,
                name: lift.name,
                unit: lift.unit,
                categorySlug: "strength",
                custom: true,
              },
            ]);
            setRankedBySlug((prev) => ({ ...prev, [lift.slug]: false }));
            setLiftBuilderOpen(false);
            router.refresh();
          }}
        />
      )}

      {editing && (
        <KpiRenameModal
          metric={editing}
          onClose={() => setEditing(null)}
          onSave={renameMetric}
        />
      )}

      {createOpen && (
        <CreateKpiSetModal
          onClose={() => setCreateOpen(false)}
          onCreated={(set) => {
            setOwnSets((prev) => [...prev, set]);
            loadSet(set);
            setCreateOpen(false);
          }}
        />
      )}

      {duplicateSource && (
        <DuplicateKpiSetModal
          source={duplicateSource}
          onClose={() => setDuplicateSource(null)}
          onCreated={(set) => {
            setOwnSets((prev) => [...prev, set]);
            setPublicSets((prev) => prev);
            loadSet(set);
            setDuplicateSource(null);
            setBrowsePublic(false);
          }}
        />
      )}
    </div>
  );
}

function CreateKpiSetModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (set: KpiSetSummary) => void;
}) {
  const [name, setName] = useState("");
  const [sport, setSport] = useState("track");
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/kpi-sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sport, isPublic, makeActive: true }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create set");
      return;
    }
    onCreated(data.set);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New KPI set"
        className="relative z-10 w-full max-w-md rounded-2xl border border-card-border bg-card p-4 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">New KPI set</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-card-border text-muted"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="block text-sm">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Crowden Track"
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2.5"
          />
        </label>
        <label className="mt-3 block text-sm">
          Sport / activity
          <select
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2.5"
          >
            {COACHING_SPORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Make public (other coaches can duplicate)
        </label>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-card-border py-2.5 text-sm font-medium text-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || !name.trim()}
            className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-background disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create set"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DuplicateKpiSetModal({
  source,
  onClose,
  onCreated,
}: {
  source: KpiSetSummary;
  onClose: () => void;
  onCreated: (set: KpiSetSummary) => void;
}) {
  const [name, setName] = useState(`${source.name} (copy)`);
  const [sport, setSport] = useState(source.sport);
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"confirm" | "form">("confirm");

  // Editable medal values seeded from source
  const [cells, setCells] = useState<TargetCell[]>(() => cellsFromSet(source));
  const [rankedBySlug, setRankedBySlug] = useState(() => rankedMapFromSet(source));
  const [gender, setGender] = useState<"F" | "M">("F");
  const [bracket, setBracket] = useState<AgeBracketId>(DEFAULT_AGE_BRACKET);

  const metricNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of source.metrics) map.set(m.metricSlug, m.metricSlug);
    return map;
  }, [source.metrics]);

  function value(slug: string, medal: Medal): string {
    const cell = cells.find(
      (c) =>
        c.gender === gender &&
        c.medal === medal &&
        c.metricSlug === slug &&
        c.ageBracket === bracket
    );
    if (!cell || cell.target == null) return "";
    return String(cell.target);
  }

  function setValue(slug: string, medal: Medal, raw: string) {
    const target = raw.trim() === "" ? null : Number(raw);
    setCells((prev) => {
      const next = prev.filter(
        (c) =>
          !(
            c.gender === gender &&
            c.medal === medal &&
            c.metricSlug === slug &&
            c.ageBracket === bracket
          )
      );
      if (target != null && Number.isFinite(target)) {
        next.push({ gender, medal, metricSlug: slug, target, ageBracket: bracket });
      }
      return next;
    });
  }

  async function submit() {
    setSaving(true);
    setError("");
    const metrics = source.metrics.map((m) => ({
      metricSlug: m.metricSlug,
      ranked: Boolean(rankedBySlug[m.metricSlug]),
      sortOrder: m.sortOrder,
    }));
    const res = await fetch(`/api/kpi-sets/${source.id}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        sport,
        isPublic,
        cells,
        metrics,
        makeActive: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Could not duplicate");
      return;
    }
    onCreated(data.set);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Duplicate KPI set"
        className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-card-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-card-border px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300/80">
              Duplicate
            </p>
            <h2 className="text-lg font-semibold">{source.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-card-border text-muted"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4">
          {step === "confirm" ? (
            <>
              <p className="text-sm text-muted">
                Duplicate{" "}
                <strong className="font-medium text-foreground">{source.name}</strong> from{" "}
                {source.coach.user.firstName} {source.coach.user.lastName}? You will assign it to a
                sport and can edit Gold / Silver / Bronze without changing the original.
              </p>
              <button
                type="button"
                onClick={() => setStep("form")}
                className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-background"
              >
                Continue
              </button>
            </>
          ) : (
            <>
              <label className="block text-sm">
                Name for your copy
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2.5"
                />
              </label>
              <label className="block text-sm">
                Assign to sport / activity
                <select
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2.5"
                >
                  {COACHING_SPORTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                Make my copy public
              </label>

              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "F" as const, label: "Girls" },
                    { id: "M" as const, label: "Boys" },
                  ] as const
                ).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGender(g.id)}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm font-semibold",
                      gender === g.id ? "bg-sky-500 text-white" : "border border-card-border text-muted"
                    )}
                  >
                    {g.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-1">
                {AGE_BRACKETS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBracket(b.id)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium",
                      bracket === b.id
                        ? "bg-sky-400/20 text-sky-300 ring-1 ring-sky-400/50"
                        : "border border-card-border text-muted"
                    )}
                  >
                    {b.shortLabel}
                  </button>
                ))}
              </div>

              <div className="space-y-2 rounded-xl border border-card-border bg-background/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Your medal values (source unchanged)
                </p>
                {[...metricNames.keys()].map((slug) => (
                  <div key={slug} className="grid grid-cols-4 gap-2 text-xs">
                    <span className="self-center truncate font-medium" title={slug}>
                      {slug}
                    </span>
                    {MEDALS.map((medal) => (
                      <label key={medal} className="block">
                        <span
                          className={
                            medal === "gold"
                              ? "text-sport-gold"
                              : medal === "silver"
                                ? "text-sport-silver"
                                : "text-sport-bronze"
                          }
                        >
                          {MEDAL_LABELS[medal]}
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={value(slug, medal)}
                          onChange={(e) => setValue(slug, medal, e.target.value)}
                          className="mt-1 w-full rounded-md border border-card-border bg-card px-2 py-1.5 font-mono"
                        />
                      </label>
                    ))}
                  </div>
                ))}
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-card-border py-2.5 text-sm font-medium text-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={saving || !name.trim()}
                  className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-background disabled:opacity-50"
                >
                  {saving ? "Duplicating…" : "Duplicate set"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiRenameModal({
  metric,
  onClose,
  onSave,
}: {
  metric: MetricInfo;
  onClose: () => void;
  onSave: (slug: string, name: string) => Promise<boolean>;
}) {
  const [name, setName] = useState(metric.name);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    await onSave(metric.slug, name.trim());
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Rename KPI"
        className="relative z-10 w-full max-w-sm rounded-2xl border border-card-border bg-card p-4 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Rename KPI</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-card-border text-muted"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="block text-sm">
          Title
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2.5"
          />
        </label>
        <p className="mt-2 text-xs text-muted">Unit: {metric.unit}</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-card-border py-2.5 text-sm font-medium text-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || !name.trim()}
            className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-background disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

type KpiBuilderDefaults = {
  categorySlug?: string;
  unit?: string;
  ageBrackets?: AgeBracketId[];
};

const LIFT_UNIT_IDS = new Set(["lb", "reps", "x BW"]);

function KpiBuilderModal({
  onClose,
  onCreated,
  defaults,
}: {
  onClose: () => void;
  onCreated: (m: MetricInfo) => void;
  defaults?: KpiBuilderDefaults;
}) {
  const [title, setTitle] = useState("");
  const [categorySlug, setCategorySlug] = useState<string>(defaults?.categorySlug ?? "flexibility");
  const [unit, setUnit] = useState(defaults?.unit ?? "reps");
  const [direction, setDirection] = useState<"HIGHER_BETTER" | "LOWER_BETTER">("HIGHER_BETTER");
  const [brackets, setBrackets] = useState<AgeBracketId[]>(
    defaults?.ageBrackets ?? ["elem-3-5", "middle-6-8"]
  );
  const [genders, setGenders] = useState<Array<"F" | "M">>(["F", "M"]);
  const [targets, setTargets] = useState<
    Record<string, Record<string, Record<string, string>>>
  >({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const unitOptions = useMemo(() => {
    if (categorySlug === "strength") {
      return KPI_UNITS.filter((u) => LIFT_UNIT_IDS.has(u.id));
    }
    return KPI_UNITS;
  }, [categorySlug]);

  useEffect(() => {
    const unitMeta = KPI_UNITS.find((u) => u.id === unit);
    if (unitMeta) setDirection(unitMeta.directionDefault);
  }, [unit]);

  useEffect(() => {
    if (categorySlug === "strength" && !LIFT_UNIT_IDS.has(unit)) {
      setUnit("lb");
    }
  }, [categorySlug, unit]);

  function toggleBracket(id: AgeBracketId) {
    setBrackets((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  }

  function toggleGender(g: "F" | "M") {
    setGenders((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  }

  function setMedalTarget(bracket: string, gender: string, medal: string, value: string) {
    setTargets((prev) => ({
      ...prev,
      [bracket]: {
        ...(prev[bracket] ?? {}),
        [gender]: {
          ...(prev[bracket]?.[gender] ?? {}),
          [medal]: value,
        },
      },
    }));
  }

  async function onSave() {
    setSaving(true);
    setError("");
    const numericTargets: Record<string, Record<string, Record<string, number>>> = {};
    for (const b of brackets) {
      numericTargets[b] = {};
      for (const g of genders) {
        numericTargets[b]![g] = {};
        for (const medal of MEDALS) {
          const raw = targets[b]?.[g]?.[medal];
          if (raw != null && raw !== "" && Number.isFinite(Number(raw))) {
            numericTargets[b]![g]![medal] = Number(raw);
          }
        }
      }
    }

    const res = await fetch("/api/kpi-targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        title,
        categorySlug,
        unit,
        direction,
        ageBrackets: brackets,
        genders,
        targets: numericTargets,
      }),
    });
    setSaving(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not create KPI");
      return;
    }
    onCreated({
      slug: data.activity.slug,
      name: data.activity.name,
      unit,
      categorySlug,
      custom: true,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Build KPI"
        className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-card-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-card-border px-4 py-3 sm:px-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300/80">
              KPI builder
            </p>
            <h2 className="text-lg font-semibold">New school metric</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-card-border text-muted"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          {categorySlug === "strength" ? (
            <p className="text-sm text-muted">
              Strength category — use lb, reps, or × BW. For the dedicated lift flow (same API), you
              can also close this and click <strong className="font-medium">Build lift</strong>.
            </p>
          ) : null}
          <label className="block text-sm">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={categorySlug === "strength" ? "Trap bar deadlift" : "V-sit and reach"}
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2.5"
            />
          </label>

          <label className="block text-sm">
            Category
            <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2.5"
            >
              {KPI_CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            Unit / metric
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2.5"
            >
              {unitOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend className="text-sm">Scoring</legend>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(
                [
                  { id: "HIGHER_BETTER" as const, label: "Higher is better" },
                  { id: "LOWER_BETTER" as const, label: "Lower / faster is better" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDirection(opt.id)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm",
                    direction === opt.id
                      ? "border-sky-400/50 bg-sky-400/15 text-sky-200"
                      : "border-card-border text-muted"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm">Age bands</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {AGE_BRACKETS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggleBracket(b.id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold",
                    brackets.includes(b.id)
                      ? "bg-sky-400/20 text-sky-300 ring-1 ring-sky-400/50"
                      : "border border-card-border text-muted"
                  )}
                >
                  {b.shortLabel}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm">Genders</legend>
            <div className="mt-2 flex gap-2">
              {(["F", "M"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGender(g)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold",
                    genders.includes(g)
                      ? "bg-sky-400/20 text-sky-300 ring-1 ring-sky-400/50"
                      : "border border-card-border text-muted"
                  )}
                >
                  {g === "F" ? "Girls" : "Boys"}
                </button>
              ))}
            </div>
          </fieldset>

          {brackets.length > 0 && genders.length > 0 && (
            <div className="space-y-3 rounded-xl border border-card-border bg-background/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Optional medal targets (leave blank = unranked)
              </p>
              {brackets.map((b) => (
                <div key={b} className="space-y-2">
                  <p className="text-sm font-medium">
                    {AGE_BRACKETS.find((x) => x.id === b)?.label}
                  </p>
                  {genders.map((g) => (
                    <div key={g} className="grid grid-cols-4 gap-2 text-xs">
                      <span className="self-center text-muted">{g === "F" ? "Girls" : "Boys"}</span>
                      {MEDALS.map((medal) => (
                        <label key={medal} className="block">
                          <span
                            className={
                              medal === "gold"
                                ? "text-sport-gold"
                                : medal === "silver"
                                  ? "text-sport-silver"
                                  : "text-sport-bronze"
                            }
                          >
                            {MEDAL_LABELS[medal]}
                          </span>
                          <input
                            type="number"
                            step="any"
                            value={targets[b]?.[g]?.[medal] ?? ""}
                            onChange={(e) => setMedalTarget(b, g, medal, e.target.value)}
                            className="mt-1 w-full rounded-md border border-card-border bg-card px-2 py-1.5 font-mono"
                          />
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex gap-2 border-t border-card-border p-4 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-card-border py-2.5 text-sm font-medium text-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !title.trim() || brackets.length === 0}
            className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-background disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save KPI"}
          </button>
        </div>
      </div>
    </div>
  );
}
