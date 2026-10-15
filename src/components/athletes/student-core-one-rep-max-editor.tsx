"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CoreOneRepMaxRow } from "@/lib/queries/student-core-one-rep-max";
import { cn } from "@/lib/utils";

export function StudentCoreOneRepMaxEditor({
  studentId,
  initialRows,
}: {
  studentId: string;
  initialRows: CoreOneRepMaxRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function setCore(slug: string, raw: string) {
    setSaved(false);
    setRows((current) =>
      current.map((row) => {
        if (row.slug !== slug) return row;
        const coreLb = raw.trim() === "" ? null : Number(raw);
        const coreValid = coreLb != null && Number.isFinite(coreLb) && coreLb > 0 ? coreLb : null;
        const effectiveLb = row.testedLb ?? coreValid;
        const source =
          row.testedLb != null
            ? ("tested" as const)
            : coreValid != null
              ? ("core" as const)
              : null;
        return { ...row, coreLb: coreValid, effectiveLb, source };
      })
    );
  }

  async function save() {
    setPending(true);
    setError(null);
    setSaved(false);
    const res = await fetch(`/api/students/${studentId}/core-one-rep-maxes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        marks: rows.map((row) => ({
          slug: row.slug,
          valueLb: row.coreLb,
        })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not save starting 1RMs");
      return;
    }
    if (Array.isArray(data.rows)) setRows(data.rows as CoreOneRepMaxRow[]);
    setSaved(true);
    router.refresh();
  }

  if (rows.length === 0) return null;

  return (
    <section className="mb-6 rounded-xl border border-card-border bg-card/40 px-4 py-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Core starting 1RM</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Set a starting point for each lift (lb). Workouts that use % of 1RM—like 90% bench—use
            these until the athlete has a tested or logged mark. Tested marks always win.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save starting points"}
        </button>
      </div>
      {error ? <p className="mb-3 text-sm text-sport-red">{error}</p> : null}
      {saved ? (
        <p className="mb-3 text-sm text-emerald-300">Saved. New workout suggestions will use these values.</p>
      ) : null}
      <div className="overflow-x-auto rounded-xl border border-card-border">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="bg-card/80 text-xs text-muted">
            <tr>
              <th className="px-3 py-2">Lift</th>
              <th className="px-3 py-2">Starting 1RM (lb)</th>
              <th className="px-3 py-2">Tested best</th>
              <th className="px-3 py-2">Used for %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.slug} className="border-t border-card-border/70">
                <td className="px-3 py-2 font-medium">{row.name}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={row.coreLb ?? ""}
                    onChange={(e) => setCore(row.slug, e.target.value)}
                    placeholder="—"
                    className="w-24 rounded border border-card-border bg-background px-2 py-1 font-mono text-sm tabular-nums"
                    aria-label={`Starting 1RM for ${row.name}`}
                  />
                </td>
                <td className="px-3 py-2 font-mono tabular-nums text-muted">
                  {row.testedLb != null ? `${Math.round(row.testedLb)} lb` : "—"}
                </td>
                <td className="px-3 py-2">
                  {row.effectiveLb != null ? (
                    <span
                      className={cn(
                        "font-mono tabular-nums",
                        row.source === "tested" ? "text-foreground" : "text-sky-300"
                      )}
                    >
                      {Math.round(row.effectiveLb)} lb
                      <span className="ml-1 text-[11px] font-normal text-muted">
                        ({row.source === "tested" ? "tested" : "starting"})
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
