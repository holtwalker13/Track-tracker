import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { studentEmailDomainForSchoolSlug } from "@/lib/services/student-login";

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

export type StudentInvitePreview = {
  fullName: string;
  username: string;
  schoolName: string;
  alreadyActive: boolean;
  expired: boolean;
  used: boolean;
};

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Stable login email tied to roster student ID (not shown in the invite URL). */
export function studentLoginEmailForNumber(studentNumber: string, schoolSlug: string): string {
  const local = studentNumber.toLowerCase().replace(/[^a-z0-9]/g, "") || "student";
  const domain = studentEmailDomainForSchoolSlug(schoolSlug);
  return `${local}@${domain}`;
}

export function studentJoinPath(token: string): string {
  const qs = new URLSearchParams({ token });
  return `/student/join?${qs.toString()}`;
}

export function validateStudentPassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 128) return "Password must be at most 128 characters.";
  if (!/[a-zA-Z]/.test(password)) return "Password must include at least one letter.";
  if (!/[0-9]/.test(password)) return "Password must include at least one number.";
  return null;
}

export async function createOrRefreshStudentLoginInvite(
  studentId: string,
  createdById?: string
): Promise<{ token: string; urlPath: string; expiresAt: Date }> {
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { passwordSetAt: true } },
      school: { select: { name: true } },
    },
  });
  if (!student) throw new Error("Student not found");
  if (student.user?.passwordSetAt) {
    throw new Error("Student already has an active login");
  }

  const token = generateInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  await prisma.studentLoginInvite.upsert({
    where: { studentId },
    create: {
      studentId,
      tokenHash,
      expiresAt,
      createdById,
    },
    update: {
      tokenHash,
      expiresAt,
      usedAt: null,
      createdById,
      createdAt: new Date(),
    },
  });

  return { token, urlPath: studentJoinPath(token), expiresAt };
}

async function loadInviteByToken(token: string) {
  const tokenHash = hashInviteToken(token.trim());
  return prisma.studentLoginInvite.findUnique({
    where: { tokenHash },
    include: {
      student: {
        include: {
          user: { select: { id: true, passwordSetAt: true } },
          school: { select: { name: true, slug: true } },
        },
      },
    },
  });
}

export async function previewStudentLoginInvite(token: string): Promise<StudentInvitePreview | null> {
  const invite = await loadInviteByToken(token);
  if (!invite) return null;

  const { student } = invite;
  const alreadyActive = Boolean(student.user?.passwordSetAt);
  const used = Boolean(invite.usedAt);
  const expired = invite.expiresAt.getTime() < Date.now();

  return {
    fullName: `${student.firstName} ${student.lastName}`,
    username: student.studentNumber,
    schoolName: student.school.name,
    alreadyActive,
    expired,
    used,
  };
}

export async function completeStudentLoginInvite(input: {
  token: string;
  password: string;
  confirmName: boolean;
}): Promise<
  | { ok: true; email: string; userId: string; studentId: string; schoolId: string }
  | { ok: false; error: string }
> {
  if (!input.confirmName) {
    return { ok: false, error: "Please confirm your name before continuing." };
  }

  const passwordError = validateStudentPassword(input.password);
  if (passwordError) return { ok: false, error: passwordError };

  const invite = await loadInviteByToken(input.token);
  if (!invite) return { ok: false, error: "This link is invalid or has expired." };
  if (invite.usedAt) return { ok: false, error: "This link has already been used." };
  if (invite.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "This link has expired. Ask your coach for a new one." };
  }

  const student = invite.student;
  if (student.user?.passwordSetAt) {
    return { ok: false, error: "This account is already set up. Sign in on the login page." };
  }

  const schoolSlug = student.school.slug ?? "school";
  const email = studentLoginEmailForNumber(student.studentNumber, schoolSlug);

  const existingEmail = await prisma.user.findUnique({
    where: { email },
    select: { studentProfile: { select: { id: true } } },
  });
  if (existingEmail && existingEmail.studentProfile?.id !== student.id) {
    return { ok: false, error: "Unable to create login for this student ID. Contact your coach." };
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const now = new Date();

  const user = await prisma.$transaction(async (tx) => {
    const fresh = await tx.studentLoginInvite.findUnique({
      where: { id: invite.id },
      select: { usedAt: true, expiresAt: true },
    });
    if (!fresh || fresh.usedAt || fresh.expiresAt.getTime() < Date.now()) {
      throw new Error("INVITE_UNAVAILABLE");
    }

    let linkedUserId = student.user?.id;
    if (linkedUserId) {
      await tx.user.update({
        where: { id: linkedUserId },
        data: {
          email,
          passwordHash,
          passwordSetAt: now,
          firstName: student.firstName,
          lastName: student.lastName,
        },
      });
    } else {
      const created = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: "STUDENT",
          firstName: student.firstName,
          lastName: student.lastName,
          passwordSetAt: now,
        },
      });
      linkedUserId = created.id;
      await tx.studentProfile.update({
        where: { id: student.id },
        data: { userId: linkedUserId },
      });
    }

    await tx.studentLoginInvite.update({
      where: { id: invite.id },
      data: { usedAt: now },
    });

    return tx.user.findUniqueOrThrow({ where: { id: linkedUserId! } });
  }).catch((err: unknown) => {
    if (err instanceof Error && err.message === "INVITE_UNAVAILABLE") return null;
    throw err;
  });

  if (!user) {
    return { ok: false, error: "This link is no longer valid. Ask your coach for a new one." };
  }

  return {
    ok: true,
    email: user.email,
    userId: user.id,
    studentId: student.id,
    schoolId: student.schoolId,
  };
}

export type StudentLoginStatus = "none" | "invite" | "active";

export function studentLoginStatusFromRow(row: {
  userId: string | null;
  user: { passwordSetAt: Date | null } | null;
  loginInvite: { usedAt: Date | null; expiresAt: Date } | null;
}): StudentLoginStatus {
  if (row.user?.passwordSetAt) return "active";
  if (row.loginInvite && !row.loginInvite.usedAt && row.loginInvite.expiresAt.getTime() > Date.now()) {
    return "invite";
  }
  return "none";
}
