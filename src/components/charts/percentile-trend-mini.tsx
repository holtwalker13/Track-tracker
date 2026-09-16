"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";

export function PercentileTrendMini({
  data,
}: {
  data: { label: string; percentile: number }[];
}) {
  if (data.length < 2) return null;

  return (
    <div className="mt-3 h-16 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="pctFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={[0, 100]} hide />
          <Tooltip
            contentStyle={{ background: "#141a22", border: "1px solid #243041", fontSize: 12 }}
            formatter={(v) => [`${v}th %ile`, "Percentile"]}
          />
          <Area
            type="monotone"
            dataKey="percentile"
            stroke="#4ade80"
            fill="url(#pctFill)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
