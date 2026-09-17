"use client";

import { useState } from "react";
import { KPI_METRIC_META, MEDAL_LABELS, MEDALS, type Medal } from "@/lib/kpi-targets";
import { formatActivityValue } from "@/lib/format";

export type TargetCell = {
  gender: "F" | "M";
  medal: Medal;
  metricSlug: string;
  target: number;
};

export function KpiTargetsEditor({
  initial,
}: {
  initial: TargetCell[];
}) {
  const [cells, setCells] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  function value(gender: "F" | "M", medal: Medal, slug: string) {
    return cells.find((c) => c.gender === gender && c.medal === medal && c.metricSlug === slug)?.target ?? 0;
  }

  function setValue(gender: "F" | "M", medal: Medal, slug: string, target: number) {
    setCells((prev) => {
      const next = prev.filter(
        (c) => !(c.gender === gender && c.medal === medal && c.metricSlug === slug)
      );
      next.push({ gender, medal, metricSlug: slug, target });
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

  return (
    <div>
      <p className="mb-6 max-w-3xl text-sm text-muted">
        Gold / Silver / Bronze are <strong>your school’s</strong> training standards — not a 100m
        prediction. Jackson and Delta can set different numbers. Defaults start from the JHS key.
      </p>
      {(["F", "M"] as const).map((gender) => (
        <section key={gender} className="mb-8 overflow-x-auto rounded-2xl border border-card-border bg-card p-4">
          <h2 className="text-lg font-semibold">{gender === "F" ? "Girls" : "Boys"}</h2>
          <table className="mt-4 w-full min-w-[36rem] text-left text-sm">
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
              </tr>
            </thead>
            <tbody>
              {KPI_METRIC_META.map((meta) => (
                <tr key={meta.slug} className="border-b border-card-border/60">
                  <td className="py-2 pr-3 font-medium">
                    {meta.name}
                    <span className="mt-0.5 block text-xs font-normal text-muted">{meta.unit}</span>
                  </td>
                  {MEDALS.map((medal) => (
                    <td key={medal} className="py-2 pr-3">
                      <input
                        type="number"
                        step="any"
                        value={value(gender, medal, meta.slug)}
                        onChange={(e) =>
                          setValue(gender, medal, meta.slug, Number(e.target.value) || 0)
                        }
                        className="w-24 rounded-md border border-card-border bg-background px-2 py-1 font-mono tabular-nums"
                        aria-label={`${gender === "F" ? "Girls" : "Boys"} ${MEDAL_LABELS[medal]} ${meta.name}`}
                      />
                      <span className="ml-2 text-xs text-muted">
                        {formatActivityValue(value(gender, medal, meta.slug), meta.unit, meta.slug)}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <div className="flex items-center gap-3">
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
    </div>
  );
}
