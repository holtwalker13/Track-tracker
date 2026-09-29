"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Athlete = { id: string; name: string; studentNumber: string };

export function ClassSubgroupEditor({
  classId,
  enrolledIds,
  athletes,
  initialSubgroups,
}: {
  classId: string;
  enrolledIds: string[];
  athletes: Athlete[];
  initialSubgroups: {
    id: string;
    name: string;
    memberIds: string[];
  }[];
}) {
  const router = useRouter();
  const roster = useMemo(
    () => athletes.filter((a) => enrolledIds.includes(a.id)),
    [athletes, enrolledIds]
  );
  const [subgroups, setSubgroups] = useState(initialSubgroups);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function createSubgroup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(`/api/classes/${classId}/subgroups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, memberIds: selected }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not create subgroup");
      return;
    }
    const data = await res.json();
    setSubgroups((prev) => [...prev, data.subgroup]);
    setName("");
    setSelected([]);
    router.refresh();
  }

  async function removeSubgroup(subgroupId: string) {
    if (!confirm("Delete this subgroup?")) return;
    setBusy(true);
    const res = await fetch(`/api/classes/${classId}/subgroups/${subgroupId}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (!res.ok) return;
    setSubgroups((prev) => prev.filter((s) => s.id !== subgroupId));
    router.refresh();
  }

  function toggleStudent(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <div className="mt-10 rounded-xl border border-card-border bg-card/40 p-5">
      <h2 className="text-lg font-semibold">Testing & program subgroups</h2>
      <p className="mt-1 text-sm text-muted">
        Split a large class into stations or event groups. Coaches filter testing and workout logs
        by subgroup instead of scrolling the full roster.
      </p>

      {subgroups.length > 0 && (
        <ul className="mt-4 space-y-2">
          {subgroups.map((sg) => (
            <li
              key={sg.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-card-border px-3 py-2 text-sm"
            >
              <span>
                <span className="font-semibold">{sg.name}</span>
                <span className="ml-2 text-muted">{sg.memberIds.length} athletes</span>
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => removeSubgroup(sg.id)}
                className="text-xs text-red-400 hover:underline disabled:opacity-50"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={createSubgroup} className="mt-5 border-t border-card-border pt-5">
        <h3 className="text-sm font-semibold">New subgroup</h3>
        <label className="mt-3 block text-sm">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Fly10 — Station 2"
            className="mt-1 w-full max-w-md rounded-lg border border-card-border bg-background px-3 py-2"
          />
        </label>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Athletes</p>
        <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-card-border p-2">
          {roster.map((a) => (
            <li key={a.id}>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(a.id)}
                  onChange={() => toggleStudent(a.id)}
                />
                <span>
                  {a.name}{" "}
                  <span className="font-mono text-xs text-muted">{a.studentNumber}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background disabled:opacity-50"
        >
          {busy ? "Saving…" : "Add subgroup"}
        </button>
      </form>
    </div>
  );
}
