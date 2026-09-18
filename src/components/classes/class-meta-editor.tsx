"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GRADE_LEVELS } from "@/lib/grades";

export function ClassMetaEditor({
  classId,
  name,
  period,
  gradeLevel,
}: {
  classId: string;
  name: string;
  period: string | null;
  gradeLevel: number | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("saving");
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/classes/${classId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        period: form.get("period"),
        gradeLevel: form.get("gradeLevel"),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Update failed");
      setStatus("error");
      return;
    }
    setStatus("saved");
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-lg border border-card-border px-3 py-1.5 text-sm text-muted hover:text-foreground"
      >
        Edit class
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 rounded-xl border border-card-border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm sm:col-span-1">
          Name
          <input
            name="name"
            defaultValue={name}
            required
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Period / hour
          <input
            name="period"
            defaultValue={period ?? ""}
            placeholder="1st Hour"
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Graduating class
          <select
            name="gradeLevel"
            defaultValue={gradeLevel ?? ""}
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2"
          >
            <option value="">Mixed / none</option>
            {GRADE_LEVELS.map((y) => (
              <option key={y} value={y}>
                Class of {y}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-background disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-lg border border-card-border px-3 py-1.5 text-sm text-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
