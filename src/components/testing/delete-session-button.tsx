"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

export function DeleteSessionButton({
  sessionId,
  sessionName,
  hasResults,
}: {
  sessionId: string;
  sessionName: string;
  hasResults: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    const warn = hasResults
      ? `Delete “${sessionName}”? Recorded marks stay on athlete profiles but leave this session.`
      : `Delete empty session “${sessionName}”?`;
    if (!window.confirm(warn)) return;
    setBusy(true);
    const res = await fetch(`/api/testing/sessions/${sessionId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      window.alert("Could not delete session.");
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={busy}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-sport-red/40 text-sport-red hover:bg-sport-red/10 disabled:opacity-50"
      aria-label={busy ? "Deleting session" : `Delete ${sessionName}`}
      title="Delete session"
    >
      <Trash2 className="h-4 w-4" aria-hidden />
    </button>
  );
}
