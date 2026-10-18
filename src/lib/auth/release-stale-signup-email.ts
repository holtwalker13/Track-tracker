import { prisma } from "@/lib/db";

/** Remove abandoned signup users that still hold a roster email (common after testing). */
export async function releaseStaleSignupEmailHolder(input: {
  email: string;
  studentId: string;
  studentUserId: string | null;
  studentPasswordSetAt: Date | null;
}): Promise<void> {
  const taken = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      role: true,
      passwordSetAt: true,
      studentProfile: { select: { id: true } },
      coachProfile: { select: { id: true } },
    },
  });
  if (!taken) return;
  if (input.studentUserId && taken.id === input.studentUserId) return;
  if (taken.passwordSetAt || taken.coachProfile || taken.role === "ADMIN") return;
  if (taken.studentProfile?.id === input.studentId) return;

  if (taken.studentProfile) {
    await prisma.studentProfile.update({
      where: { id: taken.studentProfile.id },
      data: { userId: null },
    });
  }

  if (input.studentUserId && !input.studentPasswordSetAt) {
    const linked = await prisma.user.findUnique({
      where: { id: input.studentUserId },
      select: { passwordSetAt: true, coachProfile: { select: { id: true } } },
    });
    if (linked && !linked.passwordSetAt && !linked.coachProfile) {
      await prisma.emailLoginCode.deleteMany({ where: { userId: input.studentUserId } });
      await prisma.user.delete({ where: { id: input.studentUserId } }).catch(() => undefined);
      await prisma.studentProfile.update({
        where: { id: input.studentId },
        data: { userId: null },
      });
    }
  }

  await prisma.emailLoginCode.deleteMany({ where: { userId: taken.id } });
  await prisma.user.delete({ where: { id: taken.id } }).catch(() => undefined);
}
