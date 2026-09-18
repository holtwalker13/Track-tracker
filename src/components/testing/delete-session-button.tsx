"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
      className="rounded-lg border border-sport-red/40 px-4 py-2 text-sm font-medium text-sport-red hover:bg-sport-red/10 disabled:opacity-50"
    >
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}
