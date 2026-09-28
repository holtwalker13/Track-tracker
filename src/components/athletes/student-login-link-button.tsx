"use client";

import { useState } from "react";
import { Check, Copy, Link2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudentLoginStatus } from "@/lib/services/student-login-invite";

export function StudentLoginLinkButton({
  studentId,
  fullName,
  loginStatus,
}: {
  studentId: string;
  fullName: string;
  loginStatus: StudentLoginStatus;
}) {
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copyLink() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/students/${studentId}/login-invite`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : "Could not create link";
        setError(msg.length > 120 ? "Could not create link" : msg);
        return;
      }
      const url = `${window.location.origin}${data.urlPath}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Copy failed");
    } finally {
      setPending(false);
    }
  }

  const active = loginStatus === "active";
  const pendingInvite = loginStatus === "invite";

  return (
    <div className="flex flex-col items-start gap-0.5">
      <div className="inline-flex items-center gap-1">
        {active && (
          <span
            className="inline-flex h-8 w-8 items-center justify-center text-emerald-400"
            title="Student login is set up"
            aria-label={`${fullName} login is active`}
          >
            <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          </span>
        )}
        <button
          type="button"
          onClick={() => void copyLink()}
          disabled={pending}
          className={cn(
            "inline-flex h-8 items-center gap-1 rounded-lg border border-card-border px-2 transition hover:bg-white/[0.04]",
            pendingInvite && !active && "border-sky-400/40 text-sky-300",
            copied && "border-emerald-400/40 text-emerald-300"
          )}
          title={
            active
              ? `Copy password reset link for ${fullName}`
              : `Copy login setup link for ${fullName}`
          }
          aria-label={
            active
              ? `Copy password reset link for ${fullName}`
              : `Copy student login link for ${fullName}`
          }
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <>
              <Copy className={cn("h-4 w-4", copied && "text-emerald-300")} aria-hidden />
              <Link2 className={cn("h-3.5 w-3.5 opacity-70", copied && "text-emerald-300")} aria-hidden />
            </>
          )}
        </button>
      </div>
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  );
}
