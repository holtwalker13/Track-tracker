"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type ClassCoachOption = {
  id: string;
  firstName: string;
  lastName: string;
};

export function coachDisplayName(c: ClassCoachOption) {
  return `${c.firstName} ${c.lastName}`.trim() || "Coach";
}

/** Inline reassignment control for class list rows. */
export function ClassCoachInlineSelect({
  classId,
  coachId,
  coaches,
  canEdit,
}: {
  classId: string;
  coachId: string | null;
  coaches: ClassCoachOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(coachId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canEdit) {
    const assigned = coaches.find((c) => c.id === coachId);
    return (
      <span className="text-xs text-muted">
        {assigned ? coachDisplayName(assigned) : "Unassigned"}
      </span>
    );
  }

  async function onChange(next: string) {
    setValue(next);
    setError(null);
    const res = await fetch(`/api/classes/${classId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coachId: next || null }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not update coach");
      setValue(coachId ?? "");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div
      className="min-w-[9rem]"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <select
        value={value}
        disabled={pending || coaches.length === 0}
        onChange={(e) => void onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-lg border border-card-border bg-background px-2 py-1.5 text-xs disabled:opacity-50"
        aria-label="Assigned coach"
      >
        <option value="">Unassigned</option>
        {coaches.map((c) => (
          <option key={c.id} value={c.id}>
            {coachDisplayName(c)}
          </option>
        ))}
      </select>
      {error ? <p className="mt-0.5 text-[10px] text-sport-red">{error}</p> : null}
    </div>
  );
}
