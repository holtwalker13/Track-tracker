export const UI_THEME_STORAGE_KEY = "sap-ui-theme";

export type UiThemeId = "dark" | "light" | "broadcast";

export type UiThemeDefinition = {
  id: UiThemeId;
  label: string;
  description: string;
  swatches: [string, string, string];
};

export const UI_THEMES: UiThemeDefinition[] = [
  {
    id: "dark",
    label: "Base dark",
    description: "Black canvas, red rim light, gold labels",
    swatches: ["#050505", "#E10000", "#B89B5E"],
  },
  {
    id: "light",
    label: "Light mode",
    description: "Off-white panels with gold typography",
    swatches: ["#F2F0EB", "#B89B5E", "#111111"],
  },
  {
    id: "broadcast",
    label: "Broadcast red",
    description: "High-energy red field with bold contrast",
    swatches: ["#E10000", "#000000", "#FFFFFF"],
  },
];

export function isUiThemeId(value: string | null | undefined): value is UiThemeId {
  return value === "dark" || value === "light" || value === "broadcast";
}

export function readStoredUiTheme(): UiThemeId {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = window.localStorage.getItem(UI_THEME_STORAGE_KEY);
    return isUiThemeId(stored) ? stored : "dark";
  } catch {
    return "dark";
  }
}

export function applyUiTheme(theme: UiThemeId) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
}

/** Inline boot script to apply theme before first paint (FOUC). */
export const UI_THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(UI_THEME_STORAGE_KEY)};var v=localStorage.getItem(k);var t=v==="light"||v==="broadcast"?v:"dark";document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="dark";}})();`;
