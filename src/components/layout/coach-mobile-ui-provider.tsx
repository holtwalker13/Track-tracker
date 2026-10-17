"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { CoachMoreMenuSheet } from "@/components/layout/coach-more-menu-sheet";

const CoachMobileUiContext = createContext<{ openMore: () => void }>({
  openMore: () => {},
});

export function useCoachMobileMore() {
  return useContext(CoachMobileUiContext);
}

export function CoachMobileUiProvider({
  children,
  schoolName,
  isAdmin,
}: {
  children: ReactNode;
  schoolName: string | null;
  isAdmin: boolean;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const openMore = useCallback(() => setMoreOpen(true), []);

  return (
    <CoachMobileUiContext.Provider value={{ openMore }}>
      <div className="md:contents">
        <div className="pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0">{children}</div>
        <MobileBottomNav onMore={openMore} />
        <CoachMoreMenuSheet
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          schoolName={schoolName}
          isAdmin={isAdmin}
        />
      </div>
    </CoachMobileUiContext.Provider>
  );
}
