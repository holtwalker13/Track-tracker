"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import { MEDAL_LABELS, MEDALS, type Medal } from "@/lib/kpi-targets";
import {
  AGE_BRACKETS,
  DEFAULT_AGE_BRACKET,
  KPI_CATEGORIES,
  KPI_UNITS,
  type AgeBracketId,
} from "@/lib/age-brackets";
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
  target: number;
  ageBracket: string;
};

export function KpiTargetsEditor({
  initial,
  metrics,
}: {
  initial: TargetCell[];
  metrics: MetricInfo[];
}) {
  const router = useRouter();
  const [cells, setCells] = useState(initial);
  const [metricList, setMetricList] = useState(metrics);
  const [bracket, setBracket] = useState<AgeBracketId>(DEFAULT_AGE_BRACKET);
  const [gender, setGender] = useState<"F" | "M">("F");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [builderOpen, setBuilderOpen] = useState(false);

  useEffect(() => setCells(initial), [initial]);
  useEffect(() => setMetricList(metrics), [metrics]);

  function value(slug: string, medal: Medal) {
    return (
      cells.find(
        (c) =>
          c.gender === gender &&
          c.medal === medal &&
          c.metricSlug === slug &&
          c.ageBracket === bracket
      )?.target ?? ""
    );
  }

  function setValue(slug: string, medal: Medal, target: number) {
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
      next.push({ gender, medal, metricSlug: slug, target, ageBracket: bracket });
      return next;
    });
    setStatus("idle");
  }

  async function save() {
    setStatus("saving");
    const res = await fetch("/api/kpi-targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cells }),
    });
    setStatus(res.ok ? "saved" : "error");
  }

  async function deleteMetric(slug: string, isCustom: boolean) {
    if (!isCustom) {
      window.alert("Built-in KPIs can’t be deleted. Clear their targets instead.");
      return;
    }
    if (!window.confirm("Delete this custom KPI and its targets?")) return;
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
    router.refresh();
  }

  const visibleMetrics = useMemo(() => {
    // For younger brackets, hide strength-relative lifts by default unless custom
    if (bracket === "elem-k-2" || bracket === "elem-3-5") {
      return metricList.filter(
        (m) =>
          m.custom ||
          !["squat-relative", "hang-clean-relative", "20-meter-start"].includes(m.slug)
      );
    }
    return metricList;
  }, [bracket, metricList]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-2xl text-sm text-muted">
          Set Gold / Silver / Bronze by gender and age band. Build PE metrics (sit-and-reach,
          pull-ups, etc.) with the KPI builder — units can be seconds, inches, pounds, meters, or
          reps.
        </p>
        <button
          type="button"
          onClick={() => setBuilderOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-400/20 px-4 py-2.5 text-sm font-semibold text-sky-300 ring-1 ring-sky-400/40"
        >
          <Plus className="h-4 w-4" />
          Build KPI
        </button>
      </div>

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
          {([
            { id: "F" as const, label: "Girls" },
            { id: "M" as const, label: "Boys" },
          ]).map((g) => (
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
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="border-b border-card-border text-muted">
              <th className="py-2 pr-3 font-medium">Metric</th>
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
            {visibleMetrics.map((meta) => (
              <tr key={meta.slug} className="border-b border-card-border/60">
                <td className="py-2 pr-3 font-medium">
                  {meta.name}
                  <span className="mt-0.5 block text-xs font-normal text-muted">
                    {meta.unit}
                    {meta.custom ? " · custom" : ""}
                  </span>
                </td>
                {MEDALS.map((medal) => (
                  <td key={medal} className="py-2 pr-3">
                    <input
                      type="number"
                      step="any"
                      value={value(meta.slug, medal)}
                      onChange={(e) =>
                        setValue(meta.slug, medal, Number(e.target.value) || 0)
                      }
                      className="w-24 rounded-md border border-card-border bg-background px-2 py-1 font-mono tabular-nums"
                    />
                  </td>
                ))}
                <td className="py-2">
                  {meta.custom && (
                    <button
                      type="button"
                      onClick={() => deleteMetric(meta.slug, true)}
                      className="rounded-md p-1.5 text-muted hover:bg-sport-red/10 hover:text-sport-red"
                      aria-label={`Delete ${meta.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={status === "saving"}
          className="rounded-lg bg-accent px-4 py-2 font-medium text-background disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Save school targets"}
        </button>
        {status === "saved" && <p className="text-sm text-success">Saved for this school.</p>}
        {status === "error" && <p className="text-sm text-sport-red">Could not save. Try again.</p>}
      </div>

      {builderOpen && (
        <KpiBuilderModal
          onClose={() => setBuilderOpen(false)}
          onCreated={(m) => {
            setMetricList((prev) => [...prev, m]);
            setBuilderOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function KpiBuilderModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (m: MetricInfo) => void;
}) {
  const [title, setTitle] = useState("");
  const [categorySlug, setCategorySlug] = useState<string>("flexibility");
  const [unit, setUnit] = useState("reps");
  const [direction, setDirection] = useState<"HIGHER_BETTER" | "LOWER_BETTER">("HIGHER_BETTER");
  const [brackets, setBrackets] = useState<AgeBracketId[]>(["elem-3-5", "middle-6-8"]);
  const [genders, setGenders] = useState<Array<"F" | "M">>(["F", "M"]);
  const [targets, setTargets] = useState<
    Record<string, Record<string, Record<string, string>>>
  >({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unitMeta = KPI_UNITS.find((u) => u.id === unit);
    if (unitMeta) setDirection(unitMeta.directionDefault);
  }, [unit]);

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
          <label className="block text-sm">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="V-sit and reach"
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
              {KPI_UNITS.map((u) => (
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
                Optional medal targets
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
