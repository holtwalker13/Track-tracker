"use client";

import { Sparkles } from "lucide-react";
import type { AccoladeUnlockLine, XpAwardLine } from "@/lib/gamification/engine";
import { AccoladeIcon } from "@/components/gamification/accolade-icon";
import type { AccoladeCategory } from "@/lib/gamification/accolade-definitions";
import { themeForAccoladeCategory } from "@/lib/gamification/accolade-theme";
import { cn } from "@/lib/utils";

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
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border border-accent/40 bg-card p-5 shadow-lg shadow-accent/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sport-green">
            <Sparkles className="h-4 w-4" aria-hidden />
            Workout complete
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {xpLines.map((line, i) => (
              <li key={`${line.reason}-${i}`} className="text-sport-gold">
                +{line.amount} XP — {line.label}
              </li>
            ))}
          </ul>
          {totalXpToday > 0 && (
            <p className="mt-3 text-lg font-bold text-accent">+{totalXpToday} XP today</p>
          )}
          {newAccolades.length > 0 && (
            <div className="mt-4 border-t border-card-border pt-3">
              <p className="text-xs font-semibold uppercase text-muted">Accolade unlocked</p>
              {newAccolades.map((a) => {
                const cat = a.category as AccoladeCategory;
                const theme = themeForAccoladeCategory(cat);
                return (
                  <div key={a.slug} className="mt-2 flex items-center gap-2">
                    <AccoladeIcon slug={a.slug} category={cat} earned size="sm" />
                    <p className={cn("font-semibold", theme.sectionAccent)}>{a.name}</p>
                  </div>
                );
              })}
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
