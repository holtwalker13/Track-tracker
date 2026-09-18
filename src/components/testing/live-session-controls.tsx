"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Lock, LockOpen, Pause, Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export function LiveSessionControls({
  sessionId,
  status,
  recordingUnlocked,
  withinWindow,
}: {
  sessionId: string;
  status: string;
  recordingUnlocked: boolean;
  withinWindow: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const isClosed = status === "CLOSED" || status === "COMPLETED";
  const isPaused = status === "PAUSED";
  const isLive =
    !isClosed &&
    !isPaused &&
    (status === "LIVE" || status === "ACTIVE" || status === "DRAFT") &&
    withinWindow;

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
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-card-border bg-card px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/coach/testing"
          className="inline-flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-2 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </Link>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "relative flex h-2.5 w-2.5",
              isLive && recordingUnlocked && "text-sport-red"
            )}
            aria-hidden
          >
            {isLive && recordingUnlocked ? (
              <>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sport-red opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sport-red shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
              </>
            ) : (
              <span
                className={cn(
                  "inline-flex h-2.5 w-2.5 rounded-full",
                  isClosed ? "bg-muted" : isPaused ? "bg-sport-gold" : "bg-muted"
                )}
              />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {isClosed
                ? "Testing closed"
                : !withinWindow
                  ? "Live window ended (24h)"
                  : isPaused
                    ? "Paused"
                    : recordingUnlocked
                      ? "Live recording"
                      : "Recording locked"}
            </p>
            <p className="text-xs text-muted">
              {withinWindow
                ? "24-hour live window · lock when students shouldn’t self-enter"
                : "Start a new session to record again"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {!isClosed && withinWindow && (
          <>
            {isPaused || !recordingUnlocked ? (
              <button
                type="button"
                disabled={busy != null}
                onClick={() => run(isPaused ? "resume" : "unlock")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/40 px-3 py-2 text-sm font-medium text-sky-300 hover:bg-sky-400/10 disabled:opacity-50"
              >
                {isPaused ? <Play className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                {busy === "resume" || busy === "unlock" ? "…" : isPaused ? "Resume" : "Unlock"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy != null}
                  onClick={() => run("pause")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-2 text-sm font-medium text-muted hover:text-foreground disabled:opacity-50"
                >
                  <Pause className="h-4 w-4" />
                  {busy === "pause" ? "…" : "Pause"}
                </button>
                <button
                  type="button"
                  disabled={busy != null}
                  onClick={() => run("lock")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-2 text-sm font-medium text-muted hover:text-foreground disabled:opacity-50"
                >
                  <Lock className="h-4 w-4" />
                  {busy === "lock" ? "…" : "Lock"}
                </button>
              </>
            )}
          </>
        )}
        {!isClosed && (
          <button
            type="button"
            disabled={busy != null}
            onClick={() => {
              if (!window.confirm("Close this testing session? Recording will stop.")) return;
              run("close");
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sport-red/40 px-3 py-2 text-sm font-medium text-sport-red hover:bg-sport-red/10 disabled:opacity-50"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            {busy === "close" ? "…" : "Close testing"}
          </button>
        )}
      </div>
    </div>
  );
}
