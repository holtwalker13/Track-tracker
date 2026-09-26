"use client";

import { classSectionLabel } from "@/lib/periods";
import { cn } from "@/lib/utils";

type ClassOption = { id: string; name: string; period: string | null };

export function ProgramsClassTabs({
  classes,
  activeClassId,
  onSelectClass,
}: {
  classes: ClassOption[];
  activeClassId: string;
  onSelectClass: (id: string) => void;
}) {
  if (classes.length === 0) {
    return (
      <p className="text-sm text-muted">Add a PE class under Classes before scheduling workouts.</p>
    );
  }

  return (
    <div
      className="flex gap-1 overflow-x-auto border-b border-card-border pb-0 [scrollbar-width:thin]"
      role="tablist"
      aria-label="Class sections"
    >
      {classes.map((c) => {
        const active = c.id === activeClassId;
        return (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelectClass(c.id)}
            className={cn(
              "shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold transition",
              active
                ? "border-sky-400 text-sky-100"
                : "border-transparent text-muted hover:border-card-border hover:text-foreground"
            )}
          >
            {classSectionLabel(c)}
          </button>
        );
      })}
    </div>
  );
}
