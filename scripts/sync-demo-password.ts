/**
 * Always run on boot so Railway picks up password changes without a full reseed.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "rekcart";

async function main() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const result = await prisma.user.updateMany({ data: { passwordHash: hash } });
  console.log(`Demo password set to "${DEMO_PASSWORD}" for ${result.count} user(s).`);
  console.log("Demo coach: coach1@demo.local / " + DEMO_PASSWORD);
  console.log("JHS coach: coach1@jhs.demo / " + DEMO_PASSWORD);
  console.log("CHS coach: coach1@chs.demo / " + DEMO_PASSWORD);
  console.log("Admin: admin@track-tracker.demo / " + DEMO_PASSWORD);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
