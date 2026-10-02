"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export function LiveSessionControls({
  sessionId,
  status,
  recordingUnlocked,
  withinWindow,
  compact = false,
}: {
  sessionId: string;
  status: string;
  recordingUnlocked: boolean;
  withinWindow: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const isClosed = status === "CLOSED" || status === "COMPLETED";
  const isLive =
    !isClosed &&
    (status === "LIVE" || status === "ACTIVE" || status === "DRAFT") &&
    withinWindow &&
    recordingUnlocked;

  async function run(action: string) {
    setBusy(action);
    const res = await fetch(`/api/testing/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error ?? "Could not update session");
      return;
    }
    if (action === "close") {
      router.push("/coach/testing");
      router.refresh();
      return;
    }
    router.refresh();
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-card-border bg-card",
        compact ? "mb-2 px-2 py-1.5 sm:mb-3 sm:px-3 sm:py-2" : "mb-4 gap-3 rounded-2xl px-4 py-3"
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href="/coach/testing"
          className={cn(
            "inline-flex items-center gap-1 rounded-lg border border-card-border text-muted hover:text-foreground",
            compact ? "px-2 py-1.5 text-xs" : "gap-1.5 px-3 py-2 text-sm"
          )}
          aria-label="Back to testing"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          <span className={compact ? "hidden sm:inline" : undefined}>Back</span>
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "relative flex h-2.5 w-2.5 shrink-0",
              isLive && "text-sport-red"
            )}
            aria-hidden
          >
            {isLive ? (
              <>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sport-red opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sport-red shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
              </>
            ) : (
              <span
                className={cn(
                  "inline-flex h-2.5 w-2.5 rounded-full",
                  isClosed ? "bg-muted" : "bg-muted"
                )}
              />
            )}
          </span>
          <div className="min-w-0">
            <p className={cn("font-semibold leading-tight", compact ? "text-xs sm:text-sm" : "text-sm")}>
              {isClosed ? "Closed — edits allowed" : !withinWindow ? "Window ended" : isLive ? "Live" : "Ready"}
            </p>
            {!compact && (
              <p className="text-xs text-muted">
                {isClosed
                  ? "You can reopen this session anytime to fix marks."
                  : withinWindow
                    ? "Close when finished; you can still edit marks later."
                    : "Start a new session to record again"}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {!isClosed && (
          <button
            type="button"
            disabled={busy != null}
            onClick={() => {
              if (
                !window.confirm(
                  "Close this testing session? You can return later to edit marks."
                )
              ) {
                return;
              }
              run("close");
            }}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border border-sport-red/40 font-medium text-sport-red hover:bg-sport-red/10 disabled:opacity-50",
              compact ? "px-2 py-1.5 text-xs" : "gap-1.5 px-3 py-2 text-sm"
            )}
          >
            <Square className="h-3 w-3 fill-current" />
            {busy === "close" ? "…" : compact ? "Close" : "Close testing"}
          </button>
        )}
      </div>
    </div>
  );
}
