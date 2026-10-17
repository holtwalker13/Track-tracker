"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { MoreMenuSheet } from "@/components/compete/more-menu-sheet";

const CompeteUiContext = createContext<{ openMenu: () => void }>({
  openMenu: () => {},
});

export function useCompeteMenu() {
  return useContext(CompeteUiContext);
}

export function CompeteUiProvider({
  children,
  schoolName,
  isAdmin,
}: {
  children: React.ReactNode;
  schoolName: string | null;
  isAdmin: boolean;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const openMenu = useCallback(() => setMoreOpen(true), []);

  return (
    <CompeteUiContext.Provider value={{ openMenu }}>
      {children}
      <MoreMenuSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        schoolName={schoolName}
        isAdmin={isAdmin}
      />
    </CompeteUiContext.Provider>
  );
}
