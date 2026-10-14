"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SessionNameEditor({
  sessionId,
  name: initialName,
  compact,
}: {
  sessionId: string;
  name: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === initialName) return;
    setPending(true);
    setMsg(null);
    const res = await fetch(`/api/testing/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMsg(data.error ?? "Could not rename");
      return;
    }
    setMsg("Saved");
    router.refresh();
  }

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <label className="block text-sm">
        <span className="font-medium text-muted">Session name</span>
        <div className="mt-1 flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-[12rem] flex-1 rounded-lg border border-card-border bg-background px-3 py-2"
          />
          <button
            type="button"
            disabled={pending || !name.trim() || name.trim() === initialName}
            onClick={() => void save()}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save name"}
          </button>
        </div>
      </label>
      {msg ? <p className="text-xs text-muted">{msg}</p> : null}
    </div>
  );
}
