import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const BCRYPT_ROUNDS = 12;

export function validateCoachPassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 128) return "Password must be at most 128 characters.";
  return null;
}

export type CreateSchoolCoachInput = {
  schoolId: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
};

export async function createSchoolCoach(input: CreateSchoolCoachInput) {
  const email = input.email.toLowerCase().trim();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!email.includes("@")) throw new Error("Valid email is required");
  if (!firstName || !lastName) throw new Error("First and last name are required");

  const passwordError = validateCoachPassword(input.password);
  if (passwordError) throw new Error(passwordError);

  const school = await prisma.school.findUnique({ where: { id: input.schoolId }, select: { id: true } });
  if (!school) throw new Error("School not found");

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new Error("Email is already in use");

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "COACH",
      firstName,
      lastName,
      passwordSetAt: new Date(),
    },
  });

  const profile = await prisma.coachProfile.create({
    data: { userId: user.id, schoolId: input.schoolId },
  });

  return { userId: user.id, coachProfileId: profile.id, email };
}

export async function listSchoolCoaches(schoolId: string) {
  const rows = await prisma.coachProfile.findMany({
    where: { schoolId },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true, createdAt: true } },
      classes: { select: { id: true, name: true, programKind: true } },
    },
    orderBy: { user: { lastName: "asc" } },
  });
  return rows.map((r) => ({
    coachProfileId: r.id,
    userId: r.user.id,
    email: r.user.email,
    firstName: r.user.firstName,
    lastName: r.user.lastName,
    fullName: `${r.user.firstName} ${r.user.lastName}`,
    createdAt: r.user.createdAt,
    classes: r.classes,
  }));
}
