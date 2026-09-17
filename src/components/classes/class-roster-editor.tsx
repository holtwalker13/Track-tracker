"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { classYearShort } from "@/lib/grades";

type Athlete = { id: string; name: string; studentNumber: string; grade: number | null };

export function ClassRosterEditor({
  classId,
  athletes,
  enrolledIds,
}: {
  classId: string;
  athletes: Athlete[];
  enrolledIds: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(enrolledIds));
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return athletes;
    return athletes.filter(
      (a) =>
        a.name.toLowerCase().includes(needle) ||
        a.studentNumber.toLowerCase().includes(needle)
    );
  }, [athletes, q]);

  async function save() {
    setStatus("Saving…");
    const res = await fetch(`/api/classes/${classId}/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentIds: [...selected] }),
    });
    setStatus(res.ok ? `Saved ${selected.size} athletes.` : "Save failed.");
    if (res.ok) router.refresh();
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search roster"
          className="w-full max-w-sm rounded-lg border border-card-border bg-card px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={save}
          className="rounded-lg bg-accent px-4 py-2 font-medium text-background"
        >
          Save roster ({selected.size})
        </button>
      </div>
      {status && <p className="mb-3 text-sm text-muted">{status}</p>}
      <ul className="max-h-[28rem] space-y-1 overflow-y-auto rounded-xl border border-card-border p-2">
        {filtered.map((a) => {
          const on = selected.has(a.id);
          return (
            <li key={a.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-card">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(a.id)) next.delete(a.id);
                      else next.add(a.id);
                      return next;
                    });
                  }}
                />
                <span className="flex-1 font-medium">{a.name}</span>
                <span className="text-xs text-muted">
                  {a.grade != null ? classYearShort(a.grade) : ""} · {a.studentNumber}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
