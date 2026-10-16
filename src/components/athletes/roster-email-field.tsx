"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function RosterEmailField({
  studentId,
  rosterEmail,
}: {
  studentId: string;
  rosterEmail: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(rosterEmail ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: string) {
    const trimmed = next.trim().toLowerCase();
    if (trimmed === (rosterEmail ?? "").toLowerCase()) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rosterEmail: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not save email");
        setValue(rosterEmail ?? "");
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const widthCh = Math.max(22, value.length + 2);

  return (
    <div className="inline-block whitespace-nowrap">
      <input
        type="email"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => void save(value)}
        disabled={pending}
        placeholder="school email"
        size={widthCh}
        className={cn(
          "rounded border border-card-border bg-background px-2 py-1 font-mono text-xs",
          error && "border-red-400/60"
        )}
        aria-label="Student email"
      />
      {error ? <p className="mt-0.5 max-w-[16rem] whitespace-normal text-[10px] text-red-400">{error}</p> : null}
    </div>
  );
}
