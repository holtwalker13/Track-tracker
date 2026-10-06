import { prisma } from "../src/lib/db";
async function main() {
  const school = await prisma.school.findFirstOrThrow({ where: { slug: "jhs" } });
  const coach = await prisma.coachProfile.findFirstOrThrow({ where: { user: { email: "coach1@jhs.demo" } } });
  const p2 = await prisma.class.findFirstOrThrow({ where: { schoolId: school.id, period: "Period 2" } });
  await prisma.classCoach.upsert({
    where: { classId_coachId: { classId: p2.id, coachId: coach.id } },
    create: { classId: p2.id, coachId: coach.id },
    update: {},
  });
  console.log("p2:", p2.id);
}
main().finally(() => prisma.$disconnect());
