"use client";

/** @deprecated Coach mobile chrome lives in `/coach/layout` (`CoachMobileUiProvider`). */
export function CompeteUiProvider({ children }: { children: React.ReactNode }) {
  return children;
}

export function useCompeteMenu() {
  return { openMenu: () => {} };
}
