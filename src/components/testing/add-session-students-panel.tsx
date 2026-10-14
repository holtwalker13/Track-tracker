"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserPlus } from "lucide-react";

export function AddSessionStudentsPanel({
  sessionId,
  candidates,
}: {
  sessionId: string;
  candidates: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (candidates.length === 0) return null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function addSelected() {
    const studentIds = [...selected];
    if (studentIds.length === 0) return;
    setPending(true);
    setMsg(null);
    const res = await fetch(`/api/testing/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentIds }),
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMsg(data.error ?? "Could not add athletes");
      return;
    }
    setSelected(new Set());
    setMsg(`Added ${studentIds.length} athlete${studentIds.length === 1 ? "" : "s"}`);
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          <UserPlus className="mr-1.5 inline h-4 w-4 text-amber-200" aria-hidden />
          Add athletes from class
        </p>
        <button
          type="button"
          disabled={pending || selected.size === 0}
          onClick={() => void addSelected()}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-background disabled:opacity-50"
        >
          {pending ? "Adding…" : `Add selected (${selected.size})`}
        </button>
      </div>
      <p className="mb-2 text-xs text-muted">
        Class roster changed after this test started? Select students to include on this session.
      </p>
      <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
        {candidates.map((c) => (
          <li key={c.id}>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-background/40">
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onChange={() => toggle(c.id)}
              />
              {c.name}
            </label>
          </li>
        ))}
      </ul>
      {msg ? <p className="mt-2 text-xs text-muted">{msg}</p> : null}
    </section>
  );
}
