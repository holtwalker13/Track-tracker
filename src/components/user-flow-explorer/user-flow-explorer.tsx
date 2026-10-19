"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  type Edge,
  type Node,
  type NodeTypes,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng, toSvg } from "html-to-image";
import type {
  FlowGraph,
  FlowLayoutState,
  FlowScreenNode,
  FlowViewId,
  UxAuditFinding,
} from "@/lib/user-flow-explorer/types";
import { ScreenNode, type ScreenNodeData } from "@/components/user-flow-explorer/screen-node";
import { InspectorPanel } from "@/components/user-flow-explorer/inspector-panel";
import { filterGraphByView, filterGraphForJourney, JOURNEY_PRESETS } from "@/lib/user-flow-explorer/views";
import { runUxAudit, findingsForScreen } from "@/lib/user-flow-explorer/audit";
import { shortestPath } from "@/lib/user-flow-explorer/pathfinding";
import { computeNodePositions } from "@/lib/user-flow-explorer/layout";
import { cn } from "@/lib/utils";

const nodeTypes: NodeTypes = {
  screen: ScreenNode,
};

const EDGE_STYLES: Record<string, { stroke: string; strokeDasharray?: string }> = {
  navigation: { stroke: "#c6f54a" },
  redirect: { stroke: "#60a5fa", strokeDasharray: "6 4" },
  conditional: { stroke: "#fbbf24", strokeDasharray: "4 4" },
  modal: { stroke: "#a78bfa", strokeDasharray: "2 6" },
  auth: { stroke: "#f87171", strokeDasharray: "8 4" },
};

function graphToFlow(
  graph: FlowGraph,
  positions: Record<string, { x: number; y: number }>,
  opts: {
    selectedId: string | null;
    journeyRoutes: Set<string>;
    journeyEdgeIds: Set<string>;
    auditMode: boolean;
    findings: UxAuditFinding[];
    onExpand: (s: FlowScreenNode) => void;
  }
): { nodes: Node[]; edges: Edge[] } {
  const auditByScreen = new Map<string, number>();
  for (const f of opts.findings) {
    if (!f.screenId) continue;
    auditByScreen.set(f.screenId, (auditByScreen.get(f.screenId) ?? 0) + 1);
  }

  const inbound = new Map<string, number>();
  const outbound = new Map<string, number>();
  for (const e of graph.edges) {
    inbound.set(e.target, (inbound.get(e.target) ?? 0) + 1);
    outbound.set(e.source, (outbound.get(e.source) ?? 0) + 1);
  }

  const nodes: Node[] = graph.nodes.map((screen) => {
    const pos = positions[screen.id] ?? { x: 0, y: 0 };
    const inJourney = opts.journeyRoutes.size === 0 || opts.journeyRoutes.has(screen.route);
    return {
      id: screen.id,
      type: "screen",
      position: pos,
      data: {
        screen,
        inbound: inbound.get(screen.route) ?? 0,
        outbound: outbound.get(screen.route) ?? 0,
        auditCount: opts.auditMode ? findingsForScreen(opts.findings, screen.id).length : 0,
        highlighted: inJourney && opts.journeyRoutes.size > 0,
        dimmed: opts.journeyRoutes.size > 0 && !inJourney,
        onExpand: opts.onExpand,
      } satisfies ScreenNodeData,
      selected: opts.selectedId === screen.id,
    };
  });

  const nodeIdByRoute = new Map(graph.nodes.map((n) => [n.route, n.id]));

  const edges: Edge[] = graph.edges.flatMap((e) => {
    const sourceId = nodeIdByRoute.get(e.source);
    const targetId = nodeIdByRoute.get(e.target);
    if (!sourceId || !targetId) return [];
    const style = EDGE_STYLES[e.kind] ?? EDGE_STYLES.navigation;
    const onPath = opts.journeyEdgeIds.has(e.id);
    return [
      {
        id: e.id,
        source: sourceId,
        target: targetId,
        label: e.label,
        type: "smoothstep",
        animated: onPath,
        style: {
          ...style,
          strokeWidth: onPath ? 2.5 : 1.2,
          opacity: opts.journeyRoutes.size && !onPath ? 0.15 : 1,
        },
        labelStyle: { fill: "#e5e5e5", fontSize: 9 },
        labelBgStyle: { fill: "#141416", fillOpacity: 0.85 },
        labelBgPadding: [4, 6] as [number, number],
        labelBgBorderRadius: 4,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: style.stroke,
          width: 16,
          height: 16,
        },
        data: { edge: e },
      },
    ];
  });

  return { nodes, edges };
}

function ExplorerInner({
  graph,
  initialLayout,
}: {
  graph: FlowGraph;
  initialLayout: FlowLayoutState | null;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();

  const [view, setView] = useState<FlowViewId>("all");
  const [journeyId, setJourneyId] = useState<string>("");
  const [auditMode, setAuditMode] = useState(false);
  const [selected, setSelected] = useState<FlowScreenNode | null>(null);
  const [expanded, setExpanded] = useState<FlowScreenNode | null>(null);
  const [pathInfo, setPathInfo] = useState<string>("");

  const positions = useMemo(
    () => computeNodePositions(graph.nodes, initialLayout),
    [graph.nodes, initialLayout]
  );

  const filteredGraph = useMemo(() => filterGraphByView(graph, view), [graph, view]);

  const journeyPreset = JOURNEY_PRESETS.find((j) => j.id === journeyId);
  const pathResult = useMemo(() => {
    if (!journeyPreset) return null;
    return shortestPath(graph, journeyPreset.startRoute, journeyPreset.endRoute, journeyPreset.role);
  }, [graph, journeyPreset]);

  const journeyGraph = useMemo(() => {
    if (view !== "journey" || !journeyPreset || !pathResult?.found) return filteredGraph;
    return filterGraphForJourney(graph, journeyPreset, pathResult.routes);
  }, [view, journeyPreset, pathResult, filteredGraph, graph]);

  const displayGraph = view === "journey" && journeyPreset ? journeyGraph : filteredGraph;

  const findings = useMemo(
    () => (auditMode ? runUxAudit(displayGraph) : []),
    [auditMode, displayGraph]
  );

  const journeyRoutes = useMemo(() => {
    if (view !== "journey" || !pathResult?.found) return new Set<string>();
    return new Set(pathResult.routes);
  }, [view, pathResult]);

  const journeyEdgeIds = useMemo(() => {
    if (!pathResult?.found) return new Set<string>();
    return new Set(pathResult.edges.map((e) => e.id));
  }, [pathResult]);

  const onExpand = useCallback((s: FlowScreenNode) => setExpanded(s), []);

  const { nodes, edges } = useMemo(
    () =>
      graphToFlow(displayGraph, positions, {
        selectedId: selected?.id ?? null,
        journeyRoutes,
        journeyEdgeIds,
        auditMode,
        findings,
        onExpand,
      }),
    [
      displayGraph,
      positions,
      selected?.id,
      journeyRoutes,
      journeyEdgeIds,
      auditMode,
      findings,
      onExpand,
    ]
  );

  const saveLayout = useCallback(async (nodesSnapshot: Node[]) => {
    const pos: Record<string, { x: number; y: number }> = {};
    for (const n of nodesSnapshot) {
      pos[n.id] = { x: n.position.x, y: n.position.y };
    }
    await fetch("/api/internal/user-flows/layout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), positions: pos }),
    });
  }, []);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const screen = displayGraph.nodes.find((n) => n.id === node.id);
      setSelected(screen ?? null);
    },
    [displayGraph.nodes]
  );

  const traceBetween = useCallback(() => {
    if (!selected) return;
    const end = window.prompt("Destination route (e.g. /student/workout):");
    if (!end) return;
    const role =
      selected.roles.includes("STUDENT") ? "STUDENT" : selected.roles.includes("ADMIN") ? "ADMIN" : "COACH";
    const result = shortestPath(graph, selected.route, end.trim(), role);
    if (!result.found) {
      setPathInfo(`No navigable path found from ${selected.route} to ${end}.`);
      return;
    }
    setPathInfo(
      `Shortest path (${result.clickCount} clicks): ${result.routes.join(" → ")}`
    );
  }, [selected, graph]);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(displayGraph, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-flows-${view}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [displayGraph, view]);

  const exportImage = useCallback(
    async (format: "png" | "svg") => {
      const el = wrapperRef.current?.querySelector(".react-flow") as HTMLElement | null;
      if (!el) return;
      const fn = format === "png" ? toPng : toSvg;
      const dataUrl = await fn(el, { pixelRatio: 2, backgroundColor: "#0a0a0b" });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `user-flows-${view}.${format}`;
      a.click();
    },
    [view]
  );

  return (
    <div className="flex h-[calc(100vh-36px)] flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight">User Flow Explorer</h1>
          <p className="text-xs text-white/50">
            {graph.meta.routeCount} screens · {graph.meta.edgeCount} edges · scanned{" "}
            {new Date(graph.meta.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {(
            [
              ["all", "All Screens"],
              ["student", "Student"],
              ["coach", "Coach"],
              ["admin", "Administrator"],
              ["auth", "Authentication"],
              ["journey", "Selected Journey"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                view === id ? "bg-accent text-black" : "bg-white/10 text-white/80 hover:bg-white/15"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2 text-xs">
        {view === "journey" ? (
          <select
            value={journeyId}
            onChange={(e) => setJourneyId(e.target.value)}
            className="rounded border border-white/20 bg-black px-2 py-1"
          >
            <option value="">Select journey…</option>
            {JOURNEY_PRESETS.map((j) => (
              <option key={j.id} value={j.id}>
                {j.label}
              </option>
            ))}
          </select>
        ) : null}
        {pathResult && view === "journey" ? (
          <span className="text-white/60">
            {pathResult.found
              ? `Path: ${pathResult.clickCount} clicks`
              : "No complete path — check dynamic routes or auth gates."}
          </span>
        ) : null}
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={auditMode} onChange={(e) => setAuditMode(e.target.checked)} />
          UX audit overlay
        </label>
        <button type="button" className="rounded bg-white/10 px-2 py-1 hover:bg-white/15" onClick={() => fitView({ padding: 0.2 })}>
          Fit view
        </button>
        <button type="button" className="rounded bg-white/10 px-2 py-1 hover:bg-white/15" onClick={traceBetween} disabled={!selected}>
          Shortest path from selection
        </button>
        <button type="button" className="rounded bg-white/10 px-2 py-1 hover:bg-white/15" onClick={exportJson}>
          Export JSON
        </button>
        <button type="button" className="rounded bg-white/10 px-2 py-1 hover:bg-white/15" onClick={() => exportImage("png")}>
          Export PNG
        </button>
        <button type="button" className="rounded bg-white/10 px-2 py-1 hover:bg-white/15" onClick={() => exportImage("svg")}>
          Export SVG
        </button>
        <span className="text-white/40">Refresh: npm run user-flows:scan · npm run user-flows:capture</span>
      </div>

      {pathInfo ? (
        <p className="border-b border-white/10 px-4 py-2 text-xs text-accent">{pathInfo}</p>
      ) : null}

      {auditMode && findings.length ? (
        <div className="max-h-24 overflow-y-auto border-b border-white/10 px-4 py-2 text-xs text-amber-100/90">
          {findings.slice(0, 8).map((f, i) => (
            <div key={i}>
              [{f.verified ? "verified" : "heuristic"}] {f.message}
            </div>
          ))}
          {findings.length > 8 ? <div>…and {findings.length - 8} more</div> : null}
        </div>
      ) : null}

      <div ref={wrapperRef} className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onNodeDragStop={(_, __, ns) => void saveLayout(ns)}
            fitView
            minZoom={0.08}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} color="#ffffff08" />
            <Controls className="!bg-[#141416] !border-white/20 !shadow-lg [&>button]:!bg-[#141416] [&>button]:!border-white/10 [&>button]:!text-white" />
            <MiniMap
              className="!bg-[#141416] !border-white/20"
              nodeColor={() => "#c6f54a44"}
              maskColor="#000000aa"
            />
          </ReactFlow>
        </div>
        <InspectorPanel
          screen={selected}
          graph={graph}
          findings={findings}
          pathEdgeIds={journeyEdgeIds}
          onClose={() => setSelected(null)}
        />
      </div>

      {expanded ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setExpanded(null)}
          onKeyDown={(e) => e.key === "Escape" && setExpanded(null)}
          role="dialog"
        >
          <div
            className="overflow-hidden rounded-3xl border border-white/20 bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-white/10 px-4 py-2 text-sm font-medium">
              {expanded.title} · {expanded.route}
            </div>
            <div style={{ width: 390, height: 844 }} className="overflow-auto bg-black">
              {expanded.screenshotPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={expanded.screenshotPath} alt="" width={390} height={844} className="h-full w-full object-cover object-top" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-white/40">
                  No capture — run user-flows:capture with app + demo fixtures
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function UserFlowExplorer(props: { graph: FlowGraph; initialLayout: FlowLayoutState | null }) {
  return (
    <ReactFlowProvider>
      <ExplorerInner {...props} />
    </ReactFlowProvider>
  );
}
