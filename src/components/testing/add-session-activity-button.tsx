"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { CoachModal } from "@/components/ui/coach-modal";

type KpiOption = { slug: string; name: string };

export function AddSessionActivityButton({
  sessionId,
  existingSlugs,
  kpiOptions,
}: {
  sessionId: string;
  existingSlugs: string[];
  kpiOptions: KpiOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = kpiOptions.filter((o) => !existingSlugs.includes(o.slug));

  async function add() {
    if (!slug) return;
    setPending(true);
    setError(null);
    const res = await fetch(`/api/testing/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activitySlugs: [slug] }),
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not add test");
      return;
    }
    setOpen(false);
    setSlug("");
    router.refresh();
  }

  if (available.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setSlug(available[0]?.slug ?? "");
          setOpen(true);
        }}
        className="inline-flex shrink-0 snap-start items-center gap-1.5 rounded-xl border border-dashed border-sky-400/50 px-3 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-500/10"
      >
        <Plus className="h-4 w-4" />
        Add test
      </button>
      {open ? (
        <CoachModal title="Add testing metric" onClose={() => setOpen(false)} maxWidth="max-w-md">
          <div className="space-y-4">
            {error ? <p className="text-sm text-sport-red">{error}</p> : null}
            <label className="block text-sm">
              Metric
              <select
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
              >
                {available.map((o) => (
                  <option key={o.slug} value={o.slug}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={pending || !slug}
              onClick={() => void add()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
            >
              {pending ? "Adding…" : "Add to session"}
            </button>
          </div>
        </CoachModal>
      ) : null}
    </>
  );
}
