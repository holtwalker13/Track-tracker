"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DistrictPerformanceSnapshot } from "@/lib/queries/admin-coach-performance";
import { cn } from "@/lib/utils";

type ViewId = "scoreboard" | "heatmap" | "trends";

function pct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function heatColor(pctVal: number | null): string {
  if (pctVal == null) return "rgba(255,255,255,0.06)";
  if (pctVal >= 8) return "rgba(198,245,74,0.45)";
  if (pctVal >= 3) return "rgba(198,245,74,0.22)";
  if (pctVal >= 0) return "rgba(198,245,74,0.1)";
  if (pctVal >= -3) return "rgba(255,104,104,0.15)";
  return "rgba(255,104,104,0.35)";
}

export function CoachPerformanceDashboard({ data }: { data: DistrictPerformanceSnapshot }) {
  const [view, setView] = useState<ViewId>("scoreboard");
  const [schoolFilter, setSchoolFilter] = useState<string>("all");

  const schools = useMemo(() => {
    const names = new Map<string, string>();
    for (const c of data.coaches) names.set(c.schoolId, c.schoolName);
    return [...names.entries()].map(([id, name]) => ({ id, name }));
  }, [data.coaches]);

  const coaches = useMemo(
    () =>
      data.coaches.filter((c) => schoolFilter === "all" || c.schoolId === schoolFilter),
    [data.coaches, schoolFilter]
  );

  const trendChartData = useMemo(() => {
    return data.semesters.map((semester) => {
      const row: Record<string, string | number> = { semester };
      for (const m of data.metrics) {
        const vals = coaches
          .map((c) => c.bySemester.find((s) => s.semester === semester)?.avgValueByMetric[m.slug])
          .filter((v): v is number => v != null);
        row[m.slug] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      }
      return row;
    });
  }, [data.semesters, data.metrics, coaches]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">District overview</p>
          <h2 className="font-display text-2xl font-bold">{data.organizationName}</h2>
          <p className="mt-1 text-sm text-muted">
            {data.schoolCount} schools · {data.coachCount} coaches · PE fitness:{" "}
            {data.metrics.map((m) => m.name).join(", ") || "—"}
          </p>
        </div>
        <label className="text-sm text-muted">
          School
          <select
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
            className="mt-1 block rounded-lg border border-card-border bg-card px-3 py-2 text-sm text-foreground"
          >
            <option value="all">All schools</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["scoreboard", "Coach scoreboard"],
            ["heatmap", "Metric heatmap"],
            ["trends", "Semester trends"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition",
              view === id ? "filter-chip-active" : "filter-chip-inactive"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "scoreboard" ? (
        <div className="overflow-x-auto rounded-2xl border border-card-border">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-card-border bg-card/60 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Coach</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3 text-right">Classes</th>
                <th className="px-4 py-3 text-right">Students</th>
                <th className="px-4 py-3 text-right">Avg improvement</th>
                <th className="px-4 py-3 text-right">Improved</th>
                {data.metrics.map((m) => (
                  <th key={m.slug} className="px-4 py-3 text-right">
                    {m.name.split(" ")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coaches.map((c) => (
                <tr key={c.coachId} className="border-b border-card-border/60 hover:bg-card/30">
                  <td className="px-4 py-3 font-medium">{c.coachName}</td>
                  <td className="px-4 py-3 text-muted">{c.schoolName}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.classCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.studentCount}</td>
                  <td className="px-4 py-3 text-right font-semibold text-accent tabular-nums">
                    {pct(c.avgImprovementPct)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">
                    {c.pairsCompared ? `${c.improvedPairs}/${c.pairsCompared}` : "—"}
                  </td>
                  {data.metrics.map((m) => (
                    <td key={m.slug} className="px-4 py-3 text-right tabular-nums text-muted">
                      {pct(c.byMetric[m.slug]?.avgImprovementPct ?? null)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {coaches.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted">No coaches match this filter.</p>
          ) : null}
        </div>
      ) : null}

      {view === "heatmap" ? (
        <div className="overflow-x-auto rounded-2xl border border-card-border p-4">
          <p className="mb-3 text-xs text-muted">
            Average Fall → Spring improvement by coach and metric (greener = stronger gains).
          </p>
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="pb-2 text-left text-xs uppercase text-muted">Coach</th>
                {data.metrics.map((m) => (
                  <th key={m.slug} className="px-2 pb-2 text-center text-xs uppercase text-muted">
                    {m.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coaches.map((c) => (
                <tr key={c.coachId}>
                  <td className="py-2 pr-4 font-medium">{c.coachName}</td>
                  {data.metrics.map((m) => {
                    const v = c.byMetric[m.slug]?.avgImprovementPct ?? null;
                    return (
                      <td key={m.slug} className="p-1">
                        <div
                          className="rounded-lg px-2 py-3 text-center text-xs font-semibold tabular-nums"
                          style={{ backgroundColor: heatColor(v) }}
                          title={m.name}
                        >
                          {pct(v)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {view === "trends" ? (
        <div className="rounded-2xl border border-card-border bg-card/40 p-4">
          <p className="mb-4 text-xs text-muted">
            District-average mark by semester (normalized units per activity — compare shape, not
            absolute scale).
          </p>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" />
                <XAxis dataKey="semester" tick={{ fill: "#a3abb3", fontSize: 11 }} />
                <YAxis tick={{ fill: "#a3abb3", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "#1e2226",
                    border: "1px solid #2a2f34",
                    borderRadius: 8,
                  }}
                />
                <Legend />
                {data.metrics.map((m, i) => (
                  <Bar
                    key={m.slug}
                    dataKey={m.slug}
                    name={m.name}
                    fill={i === 0 ? "#c6f54a" : i === 1 ? "#35d49a" : "#f5bd4f"}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {coaches.slice(0, 6).map((c) => (
              <li
                key={c.coachId}
                className="rounded-xl border border-card-border bg-background/60 px-3 py-2 text-xs"
              >
                <span className="font-semibold">{c.coachName}</span>
                <span className="text-muted"> · {c.schoolName}</span>
                <div className="mt-1 text-accent">{pct(c.avgImprovementPct)} avg gain</div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-xs text-muted">
        Improvement compares each student&apos;s Fall semester best to their Spring semester best per
        metric. Results tie to PE classes via testing sessions when available. Run{" "}
        <code className="rounded bg-card px-1">npm run db:seed-pe-performance</code> on demo data to
        populate sample district marks.
      </p>
    </div>
  );
}
