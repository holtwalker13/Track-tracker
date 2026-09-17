"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export function ProgressLine({
  data,
  unit,
}: {
  data: { label: string; value: number; benchmark?: number }[];
  unit: string;
}) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="#243041" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: "#141a22", border: "1px solid #243041" }}
          />
          <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} name="You" />
          <Line
            type="monotone"
            dataKey="benchmark"
            stroke="#94a3b8"
            strokeDasharray="4 4"
            name="Benchmark (50th)"
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-1 text-xs text-muted">Values in {unit}</p>
    </div>
  );
}
