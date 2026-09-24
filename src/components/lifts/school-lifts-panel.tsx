"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import type { SchoolLiftEditDetails, SchoolLiftRow } from "@/lib/queries/lifts";
import { LiftBuilderModal } from "@/components/lifts/lift-builder-modal";

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

  return (
    <section className="rounded-2xl border border-card-border bg-card p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">School lift library</h2>
          <p className="text-sm text-muted">
            Built-in and custom strength events for programs and testing. Gold / silver / bronze
            targets are edited on{" "}
            <Link href="/coach/benchmarks" className="text-accent hover:underline">
              KPI targets
            </Link>{" "}
            (Build lift there too).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setBuilderOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-400/20 px-4 py-2.5 text-sm font-semibold text-sky-300 ring-1 ring-sky-400/40"
        >
          <Plus className="h-4 w-4" />
          Build lift
        </button>
      </div>

      <ul className="divide-y divide-card-border/60 text-sm">
        {lifts.map((l) => (
          <li key={l.slug} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <div>
              <span className="font-medium">{l.name}</span>
              <span className="mt-0.5 block text-xs text-muted">
                {l.unit}
                {l.custom ? " · custom" : " · catalog"}
                {!l.forWorkouts ? " · testing only (× BW)" : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void openEdit(l)}
              disabled={editLoadingSlug === l.slug}
              className="rounded-md p-1.5 text-muted hover:bg-sky-400/10 hover:text-sky-300 disabled:opacity-50"
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
