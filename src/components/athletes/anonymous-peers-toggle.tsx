"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/** Coach/admin control: hide this athlete’s name from student/parent peer views. */
export function AnonymousPeersToggle({
  studentId,
  anonymousToPeers,
  compact = false,
}: {
  studentId: string;
  anonymousToPeers: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(anonymousToPeers);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    const next = !on;
    setBusy(true);
    setOn(next);
    const res = await fetch(`/api/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anonymousToPeers: next }),
    });
    setBusy(false);
    if (!res.ok) {
      setOn(!next);
      return;
    }
    router.refresh();
  }

  const label = on
    ? "Hidden from student views — click to show name to peers"
    : "Visible to peers — click to anonymize for student views";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      title={label}
      aria-pressed={on}
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center rounded-full border transition disabled:opacity-50",
        compact ? "h-7 w-7" : "gap-1.5 px-2.5 py-1 text-xs font-semibold",
        on
          ? "border-violet-400/50 bg-violet-400/15 text-violet-300 hover:bg-violet-400/25"
          : "border-card-border text-muted hover:border-sky-400/40 hover:text-sky-300"
      )}
    >
      {on ? <EyeOff className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
      {!compact && <span>{on ? "Incognito" : "Visible"}</span>}
    </button>
  );
}
