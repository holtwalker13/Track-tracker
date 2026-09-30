import { prisma } from "@/lib/db";
import { DEFAULT_CLASS_YEAR } from "@/lib/grades";
import { buildStudentUsernameBase } from "@/lib/services/student-username";

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

async function findUserByComputedUsername(credential: string): Promise<CredentialUser | null> {
  const lower = credential.toLowerCase();
  if (!/^[a-z][a-z0-9]{2,30}$/.test(lower)) return null;

  const profiles = await prisma.studentProfile.findMany({
    where: { userId: { not: null } },
    select: {
      firstName: true,
      lastName: true,
      username: true,
      user: { include: userInclude },
      enrollments: {
        where: { schoolYear: { isCurrent: true } },
        select: { gradeLevel: true },
        take: 1,
      },
    },
    take: 2000,
  });

  for (const profile of profiles) {
    if (!profile.user) continue;
    const stored = profile.username?.toLowerCase();
    if (stored === lower) return profile.user;
    const year = profile.enrollments[0]?.gradeLevel ?? DEFAULT_CLASS_YEAR;
    const computed = buildStudentUsernameBase(profile.firstName, profile.lastName, year);
    if (computed === lower) return profile.user;
  }
  return null;
}

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

    const byComputed = await findUserByComputedUsername(raw);
    if (byComputed) return byComputed;
  }

  return null;
}
