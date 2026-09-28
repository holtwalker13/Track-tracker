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
        setError(data.error ?? "Could not create link");
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

  if (loginStatus === "active") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300/90" title="Student login active">
        <Check className="h-3.5 w-3.5" aria-hidden />
        Active
      </span>
    );
  }

  return (
    <div className="flex flex-col items-start gap-0.5">
      <button
        type="button"
        onClick={() => void copyLink()}
        disabled={pending}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-card-border px-2.5 py-1 text-xs font-semibold transition hover:bg-white/[0.04]",
          loginStatus === "invite" && "border-sky-400/40 text-sky-300"
        )}
        title={`Copy login link for ${fullName}`}
        aria-label={`Copy student login link for ${fullName}`}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : copied ? (
          <Check className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden />
        )}
        {copied ? "Copied" : loginStatus === "invite" ? "Copy link" : "Login link"}
        {!copied && !pending && <Link2 className="h-3 w-3 opacity-60" aria-hidden />}
      </button>
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  );
}
