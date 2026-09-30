/**
 * Reset shared demo/sandbox passwords on boot — never overwrite student-chosen passwords.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ADMIN_LOGIN, DEMO_CLASS_LOGIN, DEMO_PASSWORD } from "../src/lib/tenants";

const prisma = new PrismaClient();
const PASSWORD = process.env.DEMO_PASSWORD || DEMO_PASSWORD;

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const coachDomains = ["demo.local", "jhs.demo", "chs.demo"];

  const result = await prisma.user.updateMany({
    where: {
      OR: [
        { email: ADMIN_LOGIN.email },
        { email: DEMO_CLASS_LOGIN.email },
        {
          role: "COACH",
          OR: coachDomains.map((domain) => ({ email: { endsWith: `@${domain}` } })),
        },
        {
          role: "STUDENT",
          passwordSetAt: null,
          OR: coachDomains.map((domain) => ({ email: { endsWith: `@${domain}` } })),
        },
      ],
    },
    data: { passwordHash: hash },
  });

  console.log(
    `Demo password "${PASSWORD}" applied to ${result.count} sandbox account(s). Skipped students with passwords already set.`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
