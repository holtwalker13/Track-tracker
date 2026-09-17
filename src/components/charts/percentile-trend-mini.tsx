"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TrendPoint = { label: string; percentile: number; display: string };

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TrendPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]!.payload;
  return (
    <div className="rounded-md border border-card-border bg-[#141a22] px-2.5 py-1.5 text-xs shadow-lg">
      <p className="font-semibold tabular-nums text-foreground">{point.display}</p>
      <p className="mt-0.5 text-muted">{point.label}</p>
      <p className="mt-0.5 text-sport-green">{point.percentile}th %ile</p>
    </div>
  );
}

export function PercentileTrendMini({
  data,
}: {
  data: TrendPoint[];
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
          <XAxis dataKey="label" hide />
          <YAxis domain={[0, 100]} hide />
          <Tooltip content={<TrendTooltip />} />
          <Area
            type="monotone"
            dataKey="percentile"
            stroke="#4ade80"
            fill="url(#pctFill)"
            strokeWidth={2}
            activeDot={{ r: 4, stroke: "#fff", strokeWidth: 1 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
