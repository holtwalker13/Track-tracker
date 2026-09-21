import Link from "next/link";
import { PlayerAvatar } from "@/components/athletes/player-avatar";
import { cn } from "@/lib/utils";

export function PlayerRow({
  rank,
  name,
  meta,
  value,
  unitLabel,
  highlight,
  href,
}: {
  rank?: number;
  name: string;
  meta?: string;
  value: string;
  unitLabel?: string;
  percentile?: number | null;
  highlight?: boolean;
  href?: string;
}) {
  const inner = (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-2 py-1.5",
        highlight && "bg-foreground/8 ring-1 ring-foreground/15"
      )}
    >
      {rank != null && (
        <span className="w-8 shrink-0 text-right font-bold tabular-nums text-muted">{rank}</span>
      )}
      <PlayerAvatar name={name} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{name}</span>
        {meta && <span className="block text-[11px] uppercase tracking-wide text-muted">{meta}</span>}
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-mono text-sm font-semibold tabular-nums">
          {value}
          {unitLabel && (
            <span className="ml-1 text-[10px] font-normal uppercase text-muted">{unitLabel}</span>
          )}
        </span>
      </span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block rounded-lg hover:bg-card-border/20">
        {inner}
      </Link>
    );
  }
  return inner;
}
