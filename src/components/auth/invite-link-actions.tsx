"use client";

import { useCallback, useEffect, useId, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Link2, Loader2, QrCode, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function InviteLinkActions({
  subjectLabel,
  active = false,
  pendingInvite = false,
  fetchUrlPath,
  copyTitle,
  qrTitle,
}: {
  subjectLabel: string;
  active?: boolean;
  pendingInvite?: boolean;
  /** Returns a site-relative path such as `/student/join?token=…` */
  fetchUrlPath: () => Promise<string>;
  copyTitle?: string;
  qrTitle?: string;
}) {
  const dialogTitleId = useId();
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const resolveFullUrl = useCallback(async () => {
    const path = await fetchUrlPath();
    if (!path.startsWith("/")) throw new Error("Invalid invite path");
    return `${window.location.origin}${path}`;
  }, [fetchUrlPath]);

  async function copyLink() {
    setPending(true);
    setError(null);
    try {
      const url = await resolveFullUrl();
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Copy failed");
    } finally {
      setPending(false);
    }
  }

  async function openQr() {
    setPending(true);
    setError(null);
    try {
      const url = await resolveFullUrl();
      const dataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 280,
        color: { dark: "#0a0f18", light: "#ffffff" },
      });
      setQrUrl(url);
      setQrDataUrl(dataUrl);
      setQrOpen(true);
    } catch {
      setError("Could not create QR code");
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    if (!qrOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setQrOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [qrOpen]);

  const copyLabel = copyTitle ?? (active ? `Copy password reset link for ${subjectLabel}` : `Copy setup link for ${subjectLabel}`);
  const qrLabel = qrTitle ?? `Show QR code for ${subjectLabel}`;

  return (
    <>
      <div className="flex flex-col items-start gap-0.5">
        <div className="inline-flex items-center gap-1">
          {active && (
            <span
              className="inline-flex h-8 w-8 items-center justify-center text-emerald-400"
              title="Login is set up"
              aria-label={`${subjectLabel} login is active`}
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
            title={copyLabel}
            aria-label={copyLabel}
          >
            {pending && !qrOpen ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <>
                <Copy className={cn("h-4 w-4", copied && "text-emerald-300")} aria-hidden />
                <Link2 className={cn("h-3.5 w-3.5 opacity-70", copied && "text-emerald-300")} aria-hidden />
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => void openQr()}
            disabled={pending}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-card-border transition hover:bg-white/[0.04]"
            title={qrLabel}
            aria-label={qrLabel}
          >
            <QrCode className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {error && <span className="text-[10px] text-red-400">{error}</span>}
      </div>

      {qrOpen && qrDataUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="presentation"
          onClick={() => setQrOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="w-full max-w-sm rounded-2xl border border-card-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id={dialogTitleId} className="text-lg font-semibold">
                  Scan to set up login
                </h2>
                <p className="mt-1 text-sm text-muted">{subjectLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setQrOpen(false)}
                className="rounded-lg p-1 text-muted hover:bg-white/5 hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 flex justify-center rounded-xl bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- QR data URL */}
              <img src={qrDataUrl} alt={`QR code for ${subjectLabel} login setup`} width={280} height={280} />
            </div>
            <p className="mt-3 break-all text-center font-mono text-[10px] text-muted">{qrUrl}</p>
            <button
              type="button"
              className="mt-4 w-full rounded-lg border border-card-border py-2 text-sm font-medium hover:bg-background"
              onClick={() => void copyLink()}
            >
              Copy link instead
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
