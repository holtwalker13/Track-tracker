"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { SchoolLiftRow } from "@/lib/queries/lifts";
import { LiftBuilderModal } from "@/components/lifts/lift-builder-modal";

export function SchoolLiftsPanel({
  lifts: initialLifts,
}: {
  lifts: SchoolLiftRow[];
}) {
  const router = useRouter();
  const [lifts, setLifts] = useState(initialLifts);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolLiftRow | null>(null);
  const [editName, setEditName] = useState("");

  async function deleteLift(slug: string, name: string) {
    if (
      !window.confirm(
        `Remove "${name}" from your school? Custom lifts are deleted. Built-in lifts are hidden (like KPIs).`
      )
    ) {
      return;
    }
    const res = await fetch("/api/lifts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    if (!res.ok) {
      window.alert("Could not remove lift.");
      return;
    }
    setLifts((prev) => prev.filter((l) => l.slug !== slug));
    router.refresh();
  }

  async function saveRename() {
    if (!editing || !editName.trim()) return;
    const res = await fetch("/api/lifts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: editing.slug, name: editName.trim() }),
    });
    if (!res.ok) {
      window.alert("Could not rename.");
      return;
    }
    setLifts((prev) =>
      prev.map((l) => (l.slug === editing.slug ? { ...l, name: editName.trim() } : l))
    );
    setEditing(null);
    router.refresh();
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
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => {
                  setEditing(l);
                  setEditName(l.name);
                }}
                className="rounded-md p-1.5 text-muted hover:bg-sky-400/10 hover:text-sky-300"
                aria-label={`Rename ${l.name}`}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => void deleteLift(l.slug, l.name)}
                className="rounded-md p-1.5 text-muted hover:bg-sport-red/10 hover:text-sport-red"
                aria-label={`Remove ${l.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
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

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60"
            onClick={() => setEditing(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-card-border bg-card p-4">
            <h3 className="font-semibold">Rename lift</h3>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mt-2 w-full rounded-lg border border-card-border bg-background px-3 py-2"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex-1 rounded-lg border border-card-border py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveRename()}
                className="flex-1 rounded-lg bg-accent py-2 text-sm font-medium text-background"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
