import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function GamificationStatChip({
  icon: Icon,
  label,
  value,
  toneClass,
  chipBg,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  toneClass: string;
  chipBg: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-[7.5rem] items-center gap-2.5 rounded-xl border border-card-border/50 px-3 py-2",
        chipBg
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-background/40",
          toneClass
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
      </span>
      <div className="leading-tight">
        <p className={cn("text-lg font-bold tabular-nums", toneClass)}>{value}</p>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      </div>
    </div>
  );
}
