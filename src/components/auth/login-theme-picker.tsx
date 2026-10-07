"use client";

import { ThemePicker } from "@/components/theme/theme-picker";

export function LoginThemePicker() {
  return (
    <div className="mx-auto mt-4 max-w-md">
      <p className="mb-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/70">
        UI theme
      </p>
      <ThemePicker variant="footer" />
    </div>
  );
}
