"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SessionDateEditor({
  sessionId,
  testingDate,
}: {
  sessionId: string;
  testingDate: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(testingDate);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!value) {
      setMsg("Test date is required.");
      return;
    }
    const res = await fetch(`/api/testing/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testingDate: value }),
    });
    setMsg(res.ok ? "Date saved." : "Could not save date.");
    if (res.ok) router.refresh();
  }

  return (
    <form onSubmit={save} className="mb-4 flex flex-wrap items-end gap-3">
      <label className="text-sm">
        Test date
        <input
          required
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mt-1 block rounded-lg border border-card-border bg-card px-3 py-2"
        />
      </label>
      <button type="submit" className="rounded-lg border border-card-border px-3 py-2 text-sm">
        Update date
      </button>
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </form>
  );
}
