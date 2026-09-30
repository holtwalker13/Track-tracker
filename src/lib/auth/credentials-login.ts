import { prisma } from "@/lib/db";

const userInclude = { coachProfile: true, studentProfile: true } as const;

export type CredentialUser = {
  id: string;
  role: string;
  email: string;
  passwordHash: string;
  passwordSetAt: Date | null;
  coachProfile: { schoolId: string } | null;
  studentProfile: { id: string; schoolId: string } | null;
};

/** Resolve login by email, student username, or legacy student ID. */
export async function findUserByCredential(credential: string): Promise<CredentialUser | null> {
  const raw = credential.trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();

  const byEmail = await prisma.user.findUnique({
    where: { email: lower },
    include: userInclude,
  });
  if (byEmail) return byEmail;

  const byUsername = await prisma.studentProfile.findFirst({
    where: { username: { equals: lower, mode: "insensitive" } },
    include: { user: { include: userInclude } },
  });
  if (byUsername?.user) return byUsername.user;

  if (!raw.includes("@")) {
    const byStudentNumber = await prisma.studentProfile.findFirst({
      where: { studentNumber: raw.toUpperCase() },
      include: { user: { include: userInclude } },
    });
    if (byStudentNumber?.user) return byStudentNumber.user;
  }

  return null;
}
