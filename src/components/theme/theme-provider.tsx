"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyUiTheme,
  readStoredUiTheme,
  UI_THEME_STORAGE_KEY,
  type UiThemeId,
} from "@/lib/ui-theme";

type ThemeContextValue = {
  theme: UiThemeId;
  setTheme: (theme: UiThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<UiThemeId>(() =>
    typeof document !== "undefined" && document.documentElement.dataset.theme
      ? (document.documentElement.dataset.theme as UiThemeId)
      : "dark"
  );

  useEffect(() => {
    setThemeState(readStoredUiTheme());
  }, []);

  const setTheme = useCallback((next: UiThemeId) => {
    setThemeState(next);
    applyUiTheme(next);
    try {
      window.localStorage.setItem(UI_THEME_STORAGE_KEY, next);
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useUiTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useUiTheme must be used within ThemeProvider");
  }
  return ctx;
}
