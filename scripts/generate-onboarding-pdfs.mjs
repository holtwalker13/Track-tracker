import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs/onboarding");

const jobs = [
  {
    html: path.join(outDir, "admin-onboarding-checklist.html"),
    pdf: path.join(outDir, "Track-Tracker-Admin-Onboarding-Checklist.pdf"),
  },
  {
    html: path.join(outDir, "coach-getting-started.html"),
    pdf: path.join(outDir, "Track-Tracker-Coach-Getting-Started.pdf"),
  },
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const { html, pdf } of jobs) {
  await page.goto(`file://${html}`, { waitUntil: "networkidle" });
  await page.pdf({
    path: pdf,
    format: "Letter",
    printBackground: true,
    margin: { top: "0.75in", right: "0.75in", bottom: "0.75in", left: "0.75in" },
  });
  console.log(`Wrote ${pdf}`);
}

await browser.close();
