"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { coachDisplayName, type ClassCoachOption } from "@/lib/coach-display";
import { CoachTagPicker } from "@/components/classes/coach-tag-picker";

/** Inline multi-coach editor for class list rows. */
export function ClassCoachInlineSelect({
  classId,
  coachIds,
  coaches,
  canEdit,
}: {
  classId: string;
  coachIds: string[];
  coaches: ClassCoachOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(coachIds);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  if (!canEdit) {
    const labels = coachIds
      .map((id) => coaches.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => coachDisplayName(c!));
    return (
      <span className="max-w-[12rem] truncate text-xs text-muted">
        {labels.length ? labels.join(", ") : "Unassigned"}
      </span>
    );
  }

  async function save(next: string[]) {
    setValue(next);
    setError(null);
    const res = await fetch(`/api/classes/${classId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coachIds: next }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not update coaches");
      setValue(coachIds);
      return;
    }
    startTransition(() => router.refresh());
  }

  const labels = value
    .map((id) => coaches.find((c) => c.id === id))
    .filter(Boolean)
    .map((c) => coachDisplayName(c!));

  return (
    <div
      className="relative w-full min-w-0 sm:min-w-[10rem] sm:max-w-[16rem]"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen((o) => !o)}
        className="w-full truncate rounded-lg border border-card-border bg-background px-2 py-1.5 text-left text-xs disabled:opacity-50"
      >
        {labels.length ? labels.join(", ") : "Assign coaches…"}
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-[18rem] rounded-xl border border-card-border bg-card p-2 shadow-lg">
          <CoachTagPicker coaches={coaches} value={value} onChange={(next) => void save(next)} />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2 w-full rounded-lg border border-card-border px-2 py-1 text-xs text-muted"
          >
            Done
          </button>
        </div>
      ) : null}
      {error ? <p className="mt-0.5 text-[10px] text-sport-red">{error}</p> : null}
    </div>
  );
}
