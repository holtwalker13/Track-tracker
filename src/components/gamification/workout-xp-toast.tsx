"use client";

import type { AccoladeUnlockLine, XpAwardLine } from "@/lib/gamification/engine";

export function WorkoutXpToast({
  xpLines,
  totalXpToday,
  newAccolades,
  onDismiss,
}: {
  xpLines: XpAwardLine[];
  totalXpToday: number;
  newAccolades: AccoladeUnlockLine[];
  onDismiss: () => void;
}) {
  if (xpLines.length === 0 && newAccolades.length === 0) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border border-card-border bg-card p-5 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-success">
            Workout complete
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {xpLines.map((line, i) => (
              <li key={`${line.reason}-${i}`}>
                +{line.amount} XP — {line.label}
              </li>
            ))}
          </ul>
          {totalXpToday > 0 && (
            <p className="mt-3 text-lg font-bold">+{totalXpToday} XP today</p>
          )}
          {newAccolades.length > 0 && (
            <div className="mt-4 border-t border-card-border pt-3">
              <p className="text-xs font-semibold uppercase text-muted">Accolade unlocked</p>
              {newAccolades.map((a) => (
                <p key={a.slug} className="mt-2 font-semibold">
                  {a.emoji} {a.name}
                </p>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-sm text-muted hover:text-foreground"
        >
          Close
        </button>
      </div>
    </div>
  );
}
