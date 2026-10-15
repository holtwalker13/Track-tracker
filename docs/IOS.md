# Track Tracker on iPhone

The site is a Next.js App Router app. Pages read the database and the HTTP-only session cookie on the server, so `next build` cannot emit a static `index.html` for Capacitor. The iOS app is a native shell. In testing it loads the **staging HTTPS origin** in a WebView. API calls stay on that same origin (`/api/...`). No database password, `SESSION_SECRET`, or other backend credential is written into the app.

A live-reload URL is used only when `CAPACITOR_DEV_SERVER_URL` is set. Leave it unset for simulator and iPhone builds.

## Versions

| Tool | Version |
|------|---------|
| Node.js | 22 or newer (Capacitor CLI requires it) |
| npm | 10+ |
| macOS | 14 Sonoma or newer |
| Xcode | 16 or newer (this setup was prepared with Xcode 26) |
| iOS | 15 or newer |
| Capacitor | 8 |

Install Xcode from the App Store, open it once, and accept the license.

## 1. Install dependencies and point at staging

From the repo root:

```bash
npm install
cp .env.example .env   # skip this if .env already exists
```

In `.env`, point the simulator at this Mac and leave the staging URL commented out:

```bash
CAPACITOR_DEV_SERVER_URL="http://127.0.0.1:3847"
# CAPACITOR_SERVER_URL="https://your-real-staging-host.up.railway.app"
```

A physical iPhone cannot use `127.0.0.1`. Use the Mac's Wi-Fi address instead (`ipconfig getifaddr en0`), for example `http://192.168.1.10:3847`. Staging, when you have a real host, is an origin only: `https://` plus the host, no path, password, or query string. The placeholder host in older examples makes sync fail, so keep `CAPACITOR_SERVER_URL` commented until that host exists.

Web and mobile do not use a second API base URL. The browser and the WebView both call relative `/api` routes on the host they loaded. Coach, admin, student, and school checks stay on the server.

## 2. Build the shell and sync iOS

```bash
npm run mobile:build
```

That writes `mobile/www`, copies the icon, and runs Capacitor sync. Run it again after changing the server URL, plugins, or icons. React and API changes go out through a staging deploy; then relaunch the app. Sync again before the next Xcode run so the native project matches the repo.

## 3. Open Xcode and turn on signing

```bash
npm run mobile:open
```

In the project navigator, select the **App** target:

1. **Signing & Capabilities**.
2. Check **Automatically manage signing**.
3. **Team**: your Apple Account. Add the account in Xcode → Settings → Accounts if the menu is empty.
4. Leave the bundle id as `com.jhsathletics.tracktracker` unless that id is already taken by another team. If you change it, change `appId` in `capacitor.config.ts` and sync again.

No camera, location, photos, or microphone entries are required. Do not add them.

## 4. Run on your iPhone

1. Plug the iPhone in and tap **Trust** on the phone.
2. If iOS asks, enable **Settings → Privacy & Security → Developer Mode**, then restart.
3. In Xcode’s run destination menu, choose the iPhone (not a simulator).
4. Press **Run**.
5. The first install may need **Settings → General → VPN & Device Management** → trust your developer certificate.

The simulator destination is the same Run button with an iPhone simulator selected. The committed project has no server URL, so it opens the setup screen until `.env` has `CAPACITOR_DEV_SERVER_URL` and you sync.

## 5. After later changes

```bash
npm run mobile:build
npm run mobile:open
```

Press Run again. For day-to-day UI work against this Mac, stop, set `CAPACITOR_DEV_SERVER_URL` to `http://YOUR_LAN_IP:3847`, run `npm run dev`, sync, and Run. Unset that variable and sync again before you treat the build as a staging test. `npm run dev` listens on port **3847**.

## Sign-in behavior

Sessions are the existing `sap_session` cookie: HTTP-only, `SameSite=Lax`, and `Secure` when the server is in production. The WebView stores that cookie for the staging host, so quitting and reopening the app keeps you signed in. Logout is a POST that clears the cookie; the next launch shows the login screen. A bad or expired token (7 days, or a removed user) sends you to login. A failed save does not show “Saved”.

There is no OAuth redirect. CORS is unchanged because the WebView and the API are the same origin. Do not set `SameSite=None` or a wildcard origin.

## What this pass does not do

App Store upload, TestFlight, push notifications, and offline sync are later work. A physical iPhone install still has to be done on your Mac with your Apple Account; it cannot be completed from the repo alone.
