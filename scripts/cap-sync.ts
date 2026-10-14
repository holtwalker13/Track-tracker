import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveCapacitorServer } from "../src/lib/mobile-server-url";
import { writeAppIcon } from "./write-app-icon";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadCapacitorEnv() {
  const path = resolve(root, ".env");
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

function shellHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#0c0f14" />
    <title>Track Tracker</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      html, body { margin: 0; height: 100%; background: #0c0f14; color: #f1f5f9; }
      body {
        min-height: 100dvh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: max(24px, env(safe-area-inset-top)) 24px max(24px, env(safe-area-inset-bottom));
        font: 16px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main { width: min(100%, 28rem); text-align: center; }
      img { width: 88px; height: 88px; border-radius: 20px; }
      h1 { margin: 16px 0 8px; font-size: 1.5rem; letter-spacing: 0.04em; text-transform: uppercase; }
      p { margin: 0; color: #94a3b8; }
      button {
        margin-top: 20px;
        min-height: 44px;
        min-width: 44px;
        border: 0;
        border-radius: 12px;
        padding: 0 18px;
        background: #22d3ee;
        color: #0c0f14;
        font: inherit;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main>
      <img src="icon-1024.png" alt="" width="88" height="88" />
      <h1>Track Tracker</h1>
      <p>
        The iPhone shell is installed. Set <code>CAPACITOR_SERVER_URL</code> to your staging
        HTTPS origin, run <code>npm run mobile:sync</code>, then run the app again from Xcode.
      </p>
      <button type="button" onclick="location.reload()">Try again</button>
    </main>
  </body>
</html>
`;
}

function patchTransportSecurity(cleartext: boolean) {
  const plistPath = resolve(root, "ios/App/App/Info.plist");
  if (!existsSync(plistPath)) return;
  let plist = readFileSync(plistPath, "utf8");
  plist = plist.replace(/\s*<key>NSAppTransportSecurity<\/key>\s*<dict>[\s\S]*?<\/dict>/, "");
  if (cleartext) {
    const block = `
	<key>NSAppTransportSecurity</key>
	<dict>
		<key>NSAllowsLocalNetworking</key>
		<true/>
	</dict>`;
    plist = plist.replace("</dict>\n</plist>", `${block}\n</dict>\n</plist>`);
  }
  writeFileSync(plistPath, plist);
}

loadCapacitorEnv();
const server = resolveCapacitorServer({
  serverUrl: process.env.CAPACITOR_SERVER_URL,
  devServerUrl: process.env.CAPACITOR_DEV_SERVER_URL,
});

if (server.error) {
  console.error(server.error);
  process.exit(1);
}

const www = resolve(root, "mobile/www");
const iconPng = resolve(www, "icon-1024.png");
mkdirSync(www, { recursive: true });
writeFileSync(resolve(www, "index.html"), shellHtml());
writeAppIcon(iconPng);

const iconSet = resolve(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset");
const splashSet = resolve(root, "ios/App/App/Assets.xcassets/Splash.imageset");
function installBranding() {
  if (existsSync(iconSet)) {
    copyFileSync(iconPng, resolve(iconSet, "AppIcon-512@2x.png"));
  }
  if (!existsSync(splashSet)) return;
  const splash = resolve(splashSet, "splash-2732x2732.png");
  writeAppIcon(splash, 1024);
  copyFileSync(splash, resolve(splashSet, "splash-2732x2732-1.png"));
  copyFileSync(splash, resolve(splashSet, "splash-2732x2732-2.png"));
}

if (server.kind === "development") {
  console.log(`Live reload is on for this sync only: ${server.url}`);
  console.log("Unset CAPACITOR_DEV_SERVER_URL before a staging or device build.");
} else if (server.kind === "staging") {
  console.log(`iOS WebView origin: ${server.url}`);
} else {
  console.log("No CAPACITOR_SERVER_URL set. The app will show the local setup screen.");
}

const npx = resolve(dirname(process.execPath), "npx");
const sync = spawnSync(npx, ["cap", "sync", "ios"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
if (sync.status !== 0) process.exit(sync.status ?? 1);

patchTransportSecurity(server.cleartext);
installBranding();
console.log("iOS project synced.");
