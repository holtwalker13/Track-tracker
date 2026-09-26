"use client";

import { Plus } from "lucide-react";
import { classSectionLabel } from "@/lib/periods";
import { cn } from "@/lib/utils";

type ClassOption = { id: string; name: string; period: string | null };

export function ProgramsClassTabs({
  classes,
  activeClassId,
  onSelectClass,
  onQuickAssign,
  quickAssignDisabled,
}: {
  classes: ClassOption[];
  activeClassId: string;
  onSelectClass: (id: string) => void;
  onQuickAssign: () => void;
  quickAssignDisabled?: boolean;
}) {
  if (classes.length === 0) {
    return (
      <p className="text-sm text-muted">Add a PE class under Classes before assigning programs.</p>
    );
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
      {classes.map((c) => {
        const active = c.id === activeClassId;
        return (
          <div key={c.id} className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onSelectClass(c.id)}
              className={cn(
                "rounded-full border px-3 py-2 text-sm font-semibold transition",
                active
                  ? "border-sky-400/60 bg-sky-500/15 text-sky-100"
                  : "border-card-border text-muted hover:border-sky-400/30 hover:text-foreground"
              )}
            >
              {classSectionLabel(c)}
            </button>
            {active ? (
              <button
                type="button"
                title="Load selected program into this class"
                disabled={quickAssignDisabled}
                onClick={onQuickAssign}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-background shadow-md disabled:opacity-40"
                aria-label="Quick assign program to this class"
              >
                <Plus className="h-5 w-5" />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
