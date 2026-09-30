import { XP_PER_LEVEL } from "@/lib/gamification/xp";

export function XpProgressBar({
  level,
  xpIntoLevel,
  xpForNextLevel = XP_PER_LEVEL,
}: {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel?: number;
}) {
  const pct = Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">Level {level}</p>
        <p className="text-sm text-muted">
          {xpIntoLevel} / {xpForNextLevel} XP
        </p>
      </div>
      <div
        className="mt-2 h-3 overflow-hidden rounded-full bg-card-border/40"
        role="progressbar"
        aria-valuenow={xpIntoLevel}
        aria-valuemin={0}
        aria-valuemax={xpForNextLevel}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent-dim via-accent to-sport-gold transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
