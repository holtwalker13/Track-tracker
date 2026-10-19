"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, Moon, Settings, Sun, User } from "lucide-react";
import { SchoolSwitcher } from "@/components/admin/school-switcher";
import { useTheme } from "@/components/ui/theme-provider";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/constants";

export function HeaderSettingsMenu({
  role,
  schools = [],
  currentSchoolId,
  className,
}: {
  role: UserRole;
  schools?: { id: string; name: string }[];
  currentSchoolId?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";
  const showSchoolSwitcher = role === "ADMIN" && schools.length > 0;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-card-border bg-card text-muted transition hover:text-foreground"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account and settings"
        title="Settings"
      >
        {role === "ADMIN" ? (
          <Settings className="h-4 w-4" aria-hidden />
        ) : (
          <User className="h-4 w-4" aria-hidden />
        )}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,18rem)] rounded-xl border border-card-border bg-card p-3 shadow-xl"
        >
          {showSchoolSwitcher ? (
            <div className="border-b border-card-border/60 pb-3 mb-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted">
                Switch school
              </p>
              <SchoolSwitcher
                schools={schools}
                currentSchoolId={currentSchoolId}
                layout="toolbar"
              />
            </div>
          ) : null}

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              toggleTheme();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-foreground transition hover:bg-card-border/30"
          >
            {isLight ? <Moon className="h-4 w-4 shrink-0 text-muted" /> : <Sun className="h-4 w-4 shrink-0 text-muted" />}
            {isLight ? "Dark mode" : "Light mode"}
          </button>

          <form action="/api/auth/logout" method="POST" className="mt-1 border-t border-card-border/60 pt-2">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-foreground transition hover:bg-card-border/30"
            >
              <LogOut className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
