"use client";

import type { FlowGraph, FlowNavigationEdge, FlowScreenNode, UxAuditFinding } from "@/lib/user-flow-explorer/types";
import { connectionCounts, findingsForScreen } from "@/lib/user-flow-explorer/audit";
import { cn } from "@/lib/utils";

export function InspectorPanel({
  screen,
  graph,
  findings,
  pathEdgeIds,
  onClose,
}: {
  screen: FlowScreenNode | null;
  graph: FlowGraph;
  findings: UxAuditFinding[];
  pathEdgeIds: Set<string>;
  onClose: () => void;
}) {
  if (!screen) return null;

  const counts = connectionCounts(graph, screen.id);
  const incoming = graph.edges.filter((e) => e.target === screen.route);
  const outgoing = graph.edges.filter((e) => e.source === screen.route);
  const screenFindings = findingsForScreen(findings, screen.id);

  return (
    <aside className="flex h-full w-[min(420px,40vw)] shrink-0 flex-col border-l border-white/10 bg-[#0f0f11]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold">{screen.title}</h2>
        <button type="button" onClick={onClose} className="text-xs text-white/50 hover:text-white">
          Close
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <PreviewLarge screen={screen} />

        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Route</h3>
          <p className="mt-1 font-mono text-xs break-all">{screen.route}</p>
          <a
            href={screen.route}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs text-accent hover:underline"
          >
            Open in app ↗
          </a>
        </section>

        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Source</h3>
          <ul className="mt-1 space-y-1 text-xs font-mono text-white/70">
            {screen.sourceFiles.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Roles</h3>
          <p className="mt-1 text-xs">{screen.roles.join(", ")}</p>
        </section>

        <EdgeList title="Incoming" edges={incoming} pathEdgeIds={pathEdgeIds} direction="in" />
        <EdgeList title="Outgoing" edges={outgoing} pathEdgeIds={pathEdgeIds} direction="out" />

        {screen.notes.length ? (
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Notes</h3>
            <ul className="mt-1 list-disc pl-4 text-xs text-amber-100/80">
              {screen.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {screenFindings.length ? (
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/40">UX audit</h3>
            <ul className="mt-2 space-y-2">
              {screenFindings.map((f, i) => (
                <li key={i} className="rounded border border-white/10 bg-white/5 p-2 text-xs">
                  <span
                    className={cn(
                      "font-medium",
                      f.verified ? "text-emerald-300" : "text-amber-200"
                    )}
                  >
                    {f.verified ? "Verified" : "Heuristic"} · {f.kind}
                  </span>
                  <p className="mt-1 text-white/80">{f.message}</p>
                  {f.recommendation ? (
                    <p className="mt-1 text-white/50">{f.recommendation}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="text-[10px] text-white/30">
          Connections: {counts.inbound} in / {counts.outbound} out
        </p>
      </div>
    </aside>
  );
}

function PreviewLarge({ screen }: { screen: FlowScreenNode }) {
  const w = 390;
  const h = 844;
  return (
    <div className="mx-auto overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl" style={{ width: w * 0.55 }}>
      <div style={{ width: w * 0.55, height: h * 0.55, overflow: "hidden" }}>
        {screen.screenshotPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={screen.screenshotPath}
            alt=""
            width={w}
            height={h}
            className="origin-top-left scale-[0.55]"
            style={{ width: w, height: h }}
          />
        ) : (
          <div
            className="flex items-center justify-center bg-[#1a1a1c] text-xs text-white/40"
            style={{ width: w * 0.55, height: h * 0.55 }}
          >
            {screen.screenshotStatus}
          </div>
        )}
      </div>
    </div>
  );
}

function EdgeList({
  title,
  edges,
  pathEdgeIds,
  direction,
}: {
  title: string;
  edges: FlowNavigationEdge[];
  pathEdgeIds: Set<string>;
  direction: "in" | "out";
}) {
  if (!edges.length) {
    return (
      <section>
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/40">{title}</h3>
        <p className="mt-1 text-xs text-white/40">None mapped</p>
      </section>
    );
  }
  return (
    <section>
      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/40">{title}</h3>
      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs">
        {edges.map((e) => (
          <li
            key={e.id}
            className={cn(
              "rounded px-2 py-1",
              pathEdgeIds.has(e.id) ? "bg-accent/20 text-accent" : "bg-white/5 text-white/70"
            )}
          >
            <span className="font-medium">{e.label}</span>
            <span className="text-white/40">
              {" "}
              · {direction === "in" ? e.source : e.target} · {e.kind}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
