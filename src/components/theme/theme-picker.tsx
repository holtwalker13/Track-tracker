"use client";

import { Check, Palette } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { UI_THEMES } from "@/lib/ui-theme";
import { cn } from "@/lib/utils";
import { useUiTheme } from "@/components/theme/theme-provider";

export function ThemePicker({
  className,
  variant = "header",
}: {
  className?: string;
  variant?: "header" | "footer";
}) {
  const { theme, setTheme } = useUiTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const active = UI_THEMES.find((t) => t.id === theme) ?? UI_THEMES[0];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-card-border bg-card/80 text-left transition hover:border-accent/40 hover:bg-card",
          variant === "header"
            ? "px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted hover:text-foreground"
            : "w-full px-3 py-2 text-xs font-medium text-muted hover:text-foreground"
        )}
      >
        <Palette className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{active.label}</span>
        <span className="flex shrink-0 gap-0.5" aria-hidden>
          {active.swatches.map((color) => (
            <span
              key={color}
              className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
              style={{ backgroundColor: color }}
            />
          ))}
        </span>
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="UI color theme"
          className={cn(
            "absolute z-50 mt-1 min-w-[14rem] overflow-hidden rounded-xl border border-card-border bg-card shadow-xl shadow-black/40",
            variant === "header" ? "right-0 sm:min-w-[16rem]" : "left-0 right-0"
          )}
        >
          {UI_THEMES.map((option) => {
            const selected = option.id === theme;
            return (
              <li key={option.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setTheme(option.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-background/60",
                    selected && "bg-accent/10"
                  )}
                >
                  <span className="mt-0.5 flex shrink-0 gap-0.5">
                    {option.swatches.map((color) => (
                      <span
                        key={color}
                        className="h-4 w-4 rounded-md ring-1 ring-black/15"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      {option.label}
                      {selected ? <Check className="h-3.5 w-3.5 text-accent" aria-hidden /> : null}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                      {option.description}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
