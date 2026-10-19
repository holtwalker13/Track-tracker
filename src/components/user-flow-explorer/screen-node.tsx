"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { FlowScreenNode } from "@/lib/user-flow-explorer/types";

export type ScreenNodeData = {
  screen: FlowScreenNode;
  inbound: number;
  outbound: number;
  auditCount: number;
  highlighted?: boolean;
  dimmed?: boolean;
  onExpand?: (screen: FlowScreenNode) => void;
};

const PREVIEW_W = 200;
const PREVIEW_H = Math.round((PREVIEW_W * 844) / 390);

export function ScreenNode({ data, selected }: NodeProps & { data: ScreenNodeData }) {
  const { screen, inbound, outbound, auditCount, highlighted, dimmed, onExpand } = data;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-[#141416] shadow-xl transition-opacity",
        selected ? "border-accent ring-2 ring-accent/40" : "border-white/15",
        highlighted && "border-accent/80",
        dimmed && "opacity-35"
      )}
      style={{ width: PREVIEW_W + 24 }}
    >
      <Handle type="target" position={Position.Left} className="!bg-accent !w-2 !h-2" />
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">{screen.title}</p>
            <p className="truncate font-mono text-[10px] text-white/50">{screen.route}</p>
          </div>
          {auditCount > 0 ? (
            <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-medium text-amber-200">
              {auditCount}
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {screen.roles.map((r) => (
            <span
              key={r}
              className="rounded bg-white/10 px-1 py-0.5 text-[8px] uppercase tracking-wide text-white/70"
            >
              {r}
            </span>
          ))}
        </div>
      </div>
      <div
        className="mx-3 overflow-hidden rounded-xl border border-white/10 bg-black"
        style={{ width: PREVIEW_W, height: PREVIEW_H }}
      >
        {screen.screenshotPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={screen.screenshotPath}
            alt=""
            className="h-full w-full object-cover object-top"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
            <span className="text-[10px] uppercase tracking-widest text-white/40">
              {screen.screenshotStatus === "manual_review" ? "Manual review" : "No screenshot"}
            </span>
            <span className="text-[9px] text-white/30">{screen.componentPath}</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-3 py-2 text-[10px] text-white/50">
        <span>
          ↓{inbound} ↑{outbound}
        </span>
        <button
          type="button"
          className="text-accent hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            onExpand?.(screen);
          }}
        >
          Expand
        </button>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-accent !w-2 !h-2" />
    </div>
  );
}
