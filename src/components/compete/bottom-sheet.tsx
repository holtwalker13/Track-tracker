"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomSheet({
  open,
  title,
  onClose,
  children,
  footer,
  className,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement as HTMLElement | null;
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      closeRef.current?.focus();
      return () => {
        document.body.style.overflow = prev;
        openerRef.current?.focus();
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-6">
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative z-10 flex max-h-[min(92vh,100%)] w-full max-w-lg flex-col overflow-hidden",
          "rounded-t-[22px] border border-card-border bg-[#1B2023] shadow-2xl",
          "transition-transform duration-200 motion-reduce:transition-none",
          "md:max-h-[85vh] md:rounded-2xl",
          className
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-[34px] shrink-0 rounded-full bg-[#30373B] md:hidden" />
        <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-1 md:px-5 md:pt-4">
          <h2 id={titleId} className="text-xl font-semibold tracking-tight">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-[#30373B] px-5 py-4">{footer}</div>
        ) : null}
      </section>
    </div>
  );
}
