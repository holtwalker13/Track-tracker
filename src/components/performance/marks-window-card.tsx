"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DISPLAY_GROUP_LABELS, DISPLAY_GROUP_ORDER } from "@/lib/activity-groups";
import type { MarksWindow } from "@/lib/queries/marks-window";
import { cn } from "@/lib/utils";
import { ActivityIcon } from "@/lib/activity-icons";

function labelDay(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DateRangeSlider({
  dates,
  fromIdx,
  toIdx,
  onCommit,
}: {
  dates: string[];
  fromIdx: number;
  toIdx: number;
  onCommit: (fromIdx: number, toIdx: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"from" | "to" | null>(null);
  const fromRef = useRef(fromIdx);
  const toRef = useRef(toIdx);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;
  const [localFrom, setLocalFrom] = useState(fromIdx);
  const [localTo, setLocalTo] = useState(toIdx);
  const max = Math.max(0, dates.length - 1);

  useEffect(() => {
    if (dragging.current) return;
    fromRef.current = fromIdx;
    toRef.current = toIdx;
    setLocalFrom(fromIdx);
    setLocalTo(toIdx);
  }, [fromIdx, toIdx]);

  useEffect(() => {
    function idxFromClientX(clientX: number) {
      const el = trackRef.current;
      if (!el || max === 0) return 0;
      const rect = el.getBoundingClientRect();
      const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return Math.round(t * max);
    }

    function applyDrag(clientX: number) {
      const idx = idxFromClientX(clientX);
      if (dragging.current === "from") {
        const next = Math.min(idx, toRef.current);
        fromRef.current = next;
        setLocalFrom(next);
      } else if (dragging.current === "to") {
        const next = Math.max(idx, fromRef.current);
        toRef.current = next;
        setLocalTo(next);
      }
    }

    function onMove(event: PointerEvent) {
      if (!dragging.current) return;
      applyDrag(event.clientX);
    }

    function onUp() {
      if (!dragging.current) return;
      dragging.current = null;
      commitRef.current(fromRef.current, toRef.current);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [max]);

  const fromPct = max === 0 ? 0 : (localFrom / max) * 100;
  const toPct = max === 0 ? 100 : (localTo / max) * 100;

  function startDrag(which: "from" | "to", event: React.PointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    dragging.current = which;
  }

  function pickNearest(event: React.PointerEvent) {
    if ((event.target as HTMLElement).dataset.thumb) return;
    const el = trackRef.current;
    if (!el || max === 0) return;
    const rect = el.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const idx = Math.round(t * max);
    const fromDist = Math.abs(idx - fromRef.current);
    const toDist = Math.abs(idx - toRef.current);
    if (fromDist <= toDist) {
      dragging.current = "from";
      const next = Math.min(idx, toRef.current);
      fromRef.current = next;
      setLocalFrom(next);
    } else {
      dragging.current = "to";
      const next = Math.max(idx, fromRef.current);
      toRef.current = next;
      setLocalTo(next);
    }
  }

  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between gap-3 text-xs uppercase tracking-wider text-muted">
        <span>
          From <span className="text-foreground">{labelDay(dates[localFrom] ?? "")}</span>
        </span>
        <span>
          To <span className="text-foreground">{labelDay(dates[localTo] ?? "")}</span>
        </span>
      </div>
      <div
        ref={trackRef}
        className="relative mt-4 h-6 touch-none cursor-pointer select-none"
        onPointerDown={pickNearest}
      >
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/10" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-sky-500/40"
          style={{ left: `${fromPct}%`, width: `${Math.max(0, toPct - fromPct)}%` }}
        />
        <button
          type="button"
          data-thumb="from"
          aria-label={`From ${labelDay(dates[localFrom] ?? "")}`}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={localFrom}
          aria-valuetext={labelDay(dates[localFrom] ?? "")}
          className="absolute top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-sky-500 shadow"
          style={{ left: `${fromPct}%` }}
          onPointerDown={(e) => startDrag("from", e)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              const next = Math.max(0, localFrom - 1);
              fromRef.current = next;
              setLocalFrom(next);
              onCommit(next, localTo);
            }
            if (e.key === "ArrowRight") {
              const next = Math.min(localTo, localFrom + 1);
              fromRef.current = next;
              setLocalFrom(next);
              onCommit(next, localTo);
            }
          }}
        />
        <button
          type="button"
          data-thumb="to"
          aria-label={`To ${labelDay(dates[localTo] ?? "")}`}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={localTo}
          aria-valuetext={labelDay(dates[localTo] ?? "")}
          className="absolute top-1/2 z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-amber-400 shadow"
          style={{ left: `${toPct}%` }}
          onPointerDown={(e) => startDrag("to", e)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              const next = Math.max(localFrom, localTo - 1);
              toRef.current = next;
              setLocalTo(next);
              onCommit(localFrom, next);
            }
            if (e.key === "ArrowRight") {
              const next = Math.min(max, localTo + 1);
              toRef.current = next;
              setLocalTo(next);
              onCommit(localFrom, next);
            }
          }}
        />
      </div>
    </div>
  );
}

export function MarksWindowCard({ window }: { window: MarksWindow }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const stat = searchParams.get("stat") === "pr" ? "pr" : "avg";
  const dates = window.dates;
  const fromIdx = Math.max(0, dates.indexOf(window.from));
  const toIdx = dates.length ? Math.max(fromIdx, dates.indexOf(window.to)) : 0;

  const presets = useMemo(() => {
    const fall = dates.filter((d) => d.slice(5, 7) <= "12" && d.slice(5, 7) >= "08");
    const spring = dates.filter((d) => d.slice(5, 7) <= "07");
    return [
      { id: "all", label: "All tests", from: dates[0], to: dates[dates.length - 1] },
      { id: "fall", label: "Fall", from: fall[0], to: fall[fall.length - 1] },
      { id: "spring", label: "Spring", from: spring[0], to: spring[spring.length - 1] },
    ].filter((p) => p.from && p.to);
  }, [dates]);

  function setParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  if (dates.length === 0) {
    return (
      <div className="rounded-2xl border border-card-border bg-card p-5">
        <h2 className="text-lg font-semibold">Average vs PR</h2>
        <p className="mt-2 text-sm text-muted">No dated tests yet. Live testing records a test date so this fills in.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-card-border bg-card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Average vs PR</h2>
          <p className="mt-1 text-sm text-muted">
            Dial the window to a semester or a pair of test days. Average is every mark in range;
            PR is the best in that same window.
          </p>
        </div>
        <div className="grid grid-cols-2 rounded-lg bg-background p-1">
          {(["avg", "pr"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setParams({ stat: id === "avg" ? "" : "pr" })}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-semibold",
                stat === id ? "bg-sky-500 text-white" : "text-muted"
              )}
            >
              {id === "avg" ? "Average" : "PR"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setParams({ from: p.from!, to: p.to! })}
            className="rounded-full border border-card-border px-3 py-1 text-xs font-medium text-muted hover:text-foreground"
          >
            {p.label}
          </button>
        ))}
      </div>

      <DateRangeSlider
        dates={dates}
        fromIdx={fromIdx}
        toIdx={toIdx}
        onCommit={(nextFrom, nextTo) =>
          setParams({ from: dates[nextFrom]!, to: dates[nextTo]! })
        }
      />

      <div className="mt-6 space-y-5">
        {DISPLAY_GROUP_ORDER.map((group) => {
          const rows = window.marks.filter((m) => m.group === group);
          if (rows.length === 0) return null;
          return (
            <div key={group}>
              <p className="mb-2 text-sm font-semibold text-muted">{DISPLAY_GROUP_LABELS[group]}</p>
              <ul className="space-y-2">
                {rows.map((row) => (
                  <li key={row.activityId} className="flex items-center justify-between gap-3 text-sm">
                    <span className="inline-flex items-center gap-2">
                      <ActivityIcon slug={row.activitySlug} categorySlug={row.categorySlug} className="h-4 w-4" />
                      {row.activityName}
                      <span className="text-xs text-muted">{row.count} test{row.count === 1 ? "" : "s"}</span>
                    </span>
                    <span className="font-mono font-bold tabular-nums">
                      {stat === "pr" ? row.prDisplay : row.avgDisplay}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
