import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { CapacitorConfig } from "@capacitor/cli";
import { resolveCapacitorServer } from "./src/lib/mobile-server-url";

function loadCapacitorEnv() {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key !== "CAPACITOR_SERVER_URL" && key !== "CAPACITOR_DEV_SERVER_URL") continue;
    if (process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadCapacitorEnv();

const server = resolveCapacitorServer({
  serverUrl: process.env.CAPACITOR_SERVER_URL,
  devServerUrl: process.env.CAPACITOR_DEV_SERVER_URL,
});

if (server.error) {
  throw new Error(server.error);
}

const config: CapacitorConfig = {
  appId: "com.jhsathletics.tracktracker",
  appName: "Track Tracker",
  webDir: "mobile/www",
  ios: {
    contentInset: "never",
    backgroundColor: "#0c0f14",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#0c0f14",
      showSpinner: false,
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
};

if (server.url) {
  config.server = {
    url: server.url,
    cleartext: server.cleartext,
  };
}

export default config;
