"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import type { SchoolLiftEditDetails, SchoolLiftRow } from "@/lib/queries/lifts";
import { LiftBuilderModal } from "@/components/lifts/lift-builder-modal";
import {
  groupLifts,
  LIFT_BODY_GROUPS,
  type LiftBodyGroup,
} from "@/lib/lift-groups";
import { cn } from "@/lib/utils";

function StepBadge({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-300 ring-1 ring-sky-400/40">
        {n}
      </span>
      <span className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
    </div>
  );
}

export function SchoolLiftsPanel({
  lifts: initialLifts,
}: {
  lifts: SchoolLiftRow[];
}) {
  const router = useRouter();
  const [lifts, setLifts] = useState(initialLifts);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingLift, setEditingLift] = useState<SchoolLiftEditDetails | null>(null);
  const [editLoadingSlug, setEditLoadingSlug] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState<LiftBodyGroup | "all">("all");

  const grouped = useMemo(() => groupLifts(lifts), [lifts]);

  async function openEdit(l: SchoolLiftRow) {
    setEditLoadingSlug(l.slug);
    const res = await fetch(`/api/lifts?slug=${encodeURIComponent(l.slug)}`);
    setEditLoadingSlug(null);
    if (!res.ok) {
      window.alert("Could not load lift details.");
      return;
    }
    const data = (await res.json()) as { lift: SchoolLiftEditDetails };
    setEditingLift(data.lift);
  }

  const visibleGroups =
    filterGroup === "all"
      ? LIFT_BODY_GROUPS
      : LIFT_BODY_GROUPS.filter((g) => g.id === filterGroup);

  return (
    <section className="rounded-2xl border border-card-border bg-gradient-to-b from-card to-card/40 p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <StepBadge n={1} label="Lift library" />
          <h2 className="mt-2 text-lg font-semibold">Your lifts</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Exercises live here first — grouped by body region. Day{" "}
            <strong className="font-medium text-foreground">programs</strong> and multi-week{" "}
            <strong className="font-medium text-foreground">blocks</strong> pull from this list
            below. KPI targets:{" "}
            <Link href="/coach/benchmarks" className="text-accent hover:underline">
              benchmarks
            </Link>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={() => setBuilderOpen(true)}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-sky-400/20 px-4 py-2.5 text-sm font-semibold text-sky-300 ring-1 ring-sky-400/40"
        >
          <Plus className="h-4 w-4" />
          Create lift
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setFilterGroup("all")}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold",
            filterGroup === "all"
              ? "bg-sky-500 text-white"
              : "border border-card-border text-muted"
          )}
        >
          All
        </button>
        {LIFT_BODY_GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setFilterGroup(g.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold",
              filterGroup === g.id
                ? "bg-sky-500 text-white"
                : "border border-card-border text-muted"
            )}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {visibleGroups.map((groupMeta) => {
          const items = grouped[groupMeta.id];
          if (items.length === 0 && filterGroup !== "all" && filterGroup !== groupMeta.id) {
            return null;
          }
          if (items.length === 0) return null;
          return (
            <div
              key={groupMeta.id}
              className="rounded-xl border border-card-border/80 bg-background/40 p-3"
            >
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-sky-200/90">{groupMeta.label}</h3>
                <span className="text-[11px] text-muted">{groupMeta.hint}</span>
              </div>
              <ul className="space-y-1">
                {items.map((l) => (
                  <li
                    key={l.slug}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-card/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{l.name}</p>
                      <p className="text-[11px] text-muted">
                        {l.unit}
                        {l.custom ? " · custom" : ""}
                        {!l.forWorkouts ? " · testing only" : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void openEdit(l)}
                      disabled={editLoadingSlug === l.slug}
                      className="shrink-0 rounded-md p-1.5 text-muted hover:bg-sky-400/10 hover:text-sky-300 disabled:opacity-50"
                      aria-label={`Edit ${l.name}`}
                    >
                      {editLoadingSlug === l.slug ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Pencil className="h-4 w-4" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {builderOpen && (
        <LiftBuilderModal
          onClose={() => setBuilderOpen(false)}
          onCreated={(lift) => {
            setLifts((prev) => [...prev, lift]);
            setBuilderOpen(false);
            router.refresh();
          }}
        />
      )}

      {editingLift && (
        <LiftBuilderModal
          initialLift={editingLift}
          onClose={() => setEditingLift(null)}
          onUpdated={(lift) => {
            setLifts((prev) => prev.map((row) => (row.slug === lift.slug ? lift : row)));
            setEditingLift(null);
            router.refresh();
          }}
          onDeleted={(slug) => {
            setLifts((prev) => prev.filter((row) => row.slug !== slug));
            setEditingLift(null);
            router.refresh();
          }}
        />
      )}
    </section>
  );
}
