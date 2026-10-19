#!/usr/bin/env tsx
/**
 * Capture mobile (390×844) screenshots for static routes using Playwright.
 * Requires: app running (docker compose / npm run dev), demo DB seeded.
 * Run: npm run user-flows:capture
 */
import fs from "node:fs";
import path from "node:path";
import { discoverAppRoutes } from "../../src/lib/user-flow-explorer/discover-routes";
import { loadFlowGraph } from "../../src/lib/user-flow-explorer/load-graph";

const BASE_URL = process.env.USER_FLOWS_BASE_URL ?? "http://127.0.0.1:3847";
const OUT_DIR = path.join(process.cwd(), "data/user-flow-explorer/screenshots");

type RoleLogin = { role: "admin" | "student" | "coach"; email: string; password: string };

const LOGINS: Record<string, RoleLogin> = {
  admin: {
    role: "admin",
    email: process.env.USER_FLOWS_ADMIN_USER ?? "admin@track-tracker.demo",
    password: process.env.USER_FLOWS_DEMO_PASSWORD ?? "rekcart",
  },
  student: {
    role: "student",
    email: process.env.USER_FLOWS_STUDENT_USER ?? "demo.student",
    password: process.env.USER_FLOWS_DEMO_PASSWORD ?? "rekcart",
  },
  coach: {
    role: "coach",
    email: process.env.USER_FLOWS_COACH_USER ?? "coach@demo.local",
    password: process.env.USER_FLOWS_DEMO_PASSWORD ?? "rekcart",
  },
};

function slug(route: string) {
  return route.replace(/^\//, "").replace(/\//g, "__").replace(/:/g, "_") || "root";
}

function loginForRoute(route: string): RoleLogin | null {
  if (route.startsWith("/student")) return LOGINS.student;
  if (route.startsWith("/coach")) return LOGINS.coach;
  if (route.startsWith("/admin") || route.startsWith("/internal")) return LOGINS.admin;
  if (route.startsWith("/login") || route === "/join/class") return null;
  return LOGINS.coach;
}

async function main() {
  let playwright: typeof import("playwright");
  try {
    playwright = await import("playwright");
  } catch {
    console.error("Playwright not installed. Run: npm install -D playwright && npx playwright install chromium");
    process.exit(1);
  }

  const graph = loadFlowGraph();
  const nodes = graph?.nodes ?? discoverAppRoutes();
  const staticRoutes = nodes.filter((n) => !n.isDynamic && !n.route.includes(":"));

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await playwright.chromium.launch({ headless: true });

  for (const node of staticRoutes) {
    const out = path.join(OUT_DIR, `${slug(node.route)}.png`);
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    try {
      const login = loginForRoute(node.route);
      if (login) {
        await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: 60_000 });
        await page.fill('input[name="email"]', login.email);
        await page.fill('input[name="password"]', login.password);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1500);
        if (login.role === "admin" && node.route.startsWith("/coach")) {
          await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" });
          const enter = page.getByRole("button", { name: /enter|select/i }).first();
          if (await enter.isVisible().catch(() => false)) {
            await enter.click();
            await page.waitForTimeout(1000);
          }
        }
      }

      await page.goto(`${BASE_URL}${node.route}`, { waitUntil: "networkidle", timeout: 60_000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: out, fullPage: false });
      console.log("Captured", node.route);
    } catch (err) {
      console.warn("Skip", node.route, err instanceof Error ? err.message : err);
    } finally {
      await context.close();
    }
  }

  await browser.close();
  console.log("Done. Re-run npm run user-flows:scan to attach screenshot paths.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
