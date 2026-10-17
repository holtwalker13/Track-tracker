"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function GroupContextButton({
  primaryLine,
  secondaryLine,
  onClick,
  className,
  disabled,
}: {
  primaryLine: string;
  secondaryLine: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}) {
  const label = `Group: ${primaryLine}. ${secondaryLine}. Change group.`;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex min-h-14 w-full items-center gap-2.5 rounded-xl bg-[#1B2023] px-3 py-2.5 text-left",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-snug text-foreground">
          {primaryLine}
        </span>
        <span className="block text-xs leading-snug text-muted">{secondaryLine}</span>
      </span>
      <ChevronDown className="h-5 w-5 shrink-0 text-muted" aria-hidden />
    </button>
  );
}
