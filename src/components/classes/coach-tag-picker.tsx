"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { coachDisplayName, type ClassCoachOption } from "@/lib/coach-display";
import { cn } from "@/lib/utils";

export function CoachTagPicker({
  coaches,
  value,
  onChange,
  disabled = false,
  name = "coachIds",
}: {
  coaches: ClassCoachOption[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  /** Hidden inputs use this name (coachIds[]). */
  name?: string;
}) {
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => value.map((id) => coaches.find((c) => c.id === id)).filter(Boolean) as ClassCoachOption[],
    [value, coaches]
  );

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return coaches.filter((c) => {
      if (value.includes(c.id)) return false;
      if (!q) return true;
      return coachDisplayName(c).toLowerCase().includes(q);
    });
  }, [coaches, value, query]);

  function add(id: string) {
    if (disabled || value.includes(id)) return;
    onChange([...value, id]);
    setQuery("");
  }

  function remove(id: string) {
    if (disabled) return;
    onChange(value.filter((x) => x !== id));
  }

  return (
    <div className="space-y-2">
      {value.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      <div
        className={cn(
          "flex min-h-[2.75rem] flex-wrap items-center gap-1.5 rounded-lg border border-card-border bg-background px-2 py-1.5",
          disabled && "opacity-50"
        )}
      >
        {selected.map((c) => (
          <span
            key={c.id}
            className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-1 text-xs font-medium text-sky-100 ring-1 ring-sky-400/30"
          >
            {coachDisplayName(c)}
            {!disabled ? (
              <button
                type="button"
                onClick={() => remove(c.id)}
                className="rounded-full p-0.5 text-sky-200/80 hover:bg-sky-400/20 hover:text-white"
                aria-label={`Remove ${coachDisplayName(c)}`}
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </span>
        ))}
        {!disabled ? (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !query && value.length > 0) {
                remove(value[value.length - 1]!);
              }
              if (e.key === "Enter") {
                e.preventDefault();
                if (available[0]) add(available[0].id);
              }
            }}
            placeholder={selected.length === 0 ? "Add coaches…" : "Add another…"}
            className="min-w-[7rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted"
            disabled={disabled}
          />
        ) : selected.length === 0 ? (
          <span className="px-1 text-xs text-muted">No coaches assigned</span>
        ) : null}
      </div>

      {!disabled && (query.trim() || selected.length === 0) && available.length > 0 ? (
        <ul className="max-h-40 overflow-y-auto rounded-lg border border-card-border bg-card py-1">
          {available.slice(0, 8).map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => add(c.id)}
                className="flex w-full px-3 py-1.5 text-left text-sm hover:bg-sky-500/10"
              >
                {coachDisplayName(c)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
