"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function RosterUsernameField({
  studentId,
  username,
  usernameHint,
}: {
  studentId: string;
  username: string | null;
  usernameHint: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(username ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: string) {
    const trimmed = next.trim().toLowerCase();
    if (!trimmed || trimmed === (username ?? "").toLowerCase()) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not save username");
        setValue(username ?? "");
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-w-[7rem]">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value.toLowerCase())}
        onBlur={() => void save(value)}
        disabled={pending}
        placeholder={usernameHint}
        title={`Suggested: ${usernameHint}`}
        className={cn(
          "w-full rounded border border-card-border bg-background px-2 py-1 font-mono text-xs",
          error && "border-red-400/60"
        )}
        aria-label="Student username"
      />
      {error ? <p className="mt-0.5 text-[10px] text-red-400">{error}</p> : null}
    </div>
  );
}
