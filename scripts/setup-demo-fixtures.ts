/**
 * Track and Field KPI fixtures for General Demo and Jackson High School (JHS).
 *
 * Usage: npx tsx scripts/setup-demo-fixtures.ts
 */
import { prisma } from "../src/lib/db";
import { applyTrackFieldFixturesForSchoolSlug } from "./lib/track-field-kpi-fixtures";
import { TENANTS } from "../src/lib/tenants";

async function main() {
  const demo = TENANTS.find((t) => t.slug === "demo")!;
  const jhs = TENANTS.find((t) => t.slug === "jhs")!;

  await applyTrackFieldFixturesForSchoolSlug(prisma, "demo", {
    coachEmail: demo.coachEmail,
    studentUserEmail: demo.studentEmail ?? "student1@demo.local",
  });

  await applyTrackFieldFixturesForSchoolSlug(prisma, "jhs", {
    coachEmail: jhs.coachEmail,
    studentName: { firstName: "Kendall", lastName: "Leland" },
  });

  console.log("Fixtures ready: Track and Field + Coach Crowden's Training Group on Demo and JHS");
}

main().finally(() => prisma.$disconnect());
